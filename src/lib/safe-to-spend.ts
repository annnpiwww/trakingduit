import { calculateMoneySafety, type MoneySafetyStatus } from "./money-safety";

export type SafeToSpendConfidence = "high" | "medium" | "low";

export interface DatedGoalReserveInput {
  targetAmount: number;
  savedAmount: number;
  deadline?: string;
}

export function monthlyGoalReserve(
  { targetAmount, savedAmount, deadline }: DatedGoalReserveInput,
  currentMonth: string,
): number {
  const shortfall = Math.max(0, targetAmount - savedAmount);
  if (!deadline || shortfall === 0) return 0;

  const [currentYear, currentMonthNumber] = currentMonth.split("-").map(Number);
  const [deadlineYear, deadlineMonthNumber] = deadline.slice(0, 7).split("-").map(Number);
  const currentIndex = currentYear * 12 + currentMonthNumber;
  const deadlineIndex = deadlineYear * 12 + deadlineMonthNumber;
  const monthsRemaining = Math.max(1, deadlineIndex - currentIndex + 1);

  return Math.ceil(shortfall / monthsRemaining);
}

export interface SafeToSpendInput {
  balance: number;
  reservedBills: number;
  reservedGoals?: number;
  safetyBuffer?: number;
  daysRemaining: number;
  salaryConfigured?: boolean;
}

export interface SafeToSpendResult {
  total: number;
  perDay: number;
  reservedBills: number;
  reservedGoals: number;
  safetyBuffer: number;
  daysRemaining: number;
  confidence: SafeToSpendConfidence;
  status: MoneySafetyStatus;
  reasons: string[];
}

function nonNegative(value: number | undefined): number {
  return Math.max(0, Number.isFinite(value) ? value! : 0);
}

export function calculateSafeToSpend({
  balance,
  reservedBills,
  reservedGoals = 0,
  safetyBuffer = 0,
  daysRemaining,
  salaryConfigured = true,
}: SafeToSpendInput): SafeToSpendResult {
  const safeBalance = nonNegative(balance);
  const bills = nonNegative(reservedBills);
  const goals = nonNegative(reservedGoals);
  const buffer = nonNegative(safetyBuffer);
  const days = Math.max(1, Math.floor(Number.isFinite(daysRemaining) ? daysRemaining : 1));
  const moneySafety = calculateMoneySafety({
    balance: safeBalance,
    daysRemaining: days,
    billsDue: bills,
    plannedGoalContribution: goals,
    safetyBuffer: buffer,
    salaryConfigured,
    dataCompleteness: salaryConfigured ? "full" : "partial",
  });

  return {
    total: moneySafety.plannedFreeMoney ?? 0,
    perDay: moneySafety.safePerDay ?? 0,
    reservedBills: bills,
    reservedGoals: goals,
    safetyBuffer: buffer,
    daysRemaining: days,
    confidence: moneySafety.confidence,
    status: moneySafety.status,
    reasons: moneySafety.reasons,
  };
}
