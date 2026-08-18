export type MoneySafetyStatus = "safe" | "attention" | "insufficient-data";
export type MoneySafetyConfidence = "high" | "medium" | "low";

export type MoneySafetyInput = {
  balance: number;
  daysRemaining: number;
  billsDue: number;
  plannedGoalContribution: number;
  safetyBuffer: number;
  salaryConfigured: boolean;
  dataCompleteness: "full" | "partial";
};

export type MoneySafetyResult = {
  status: MoneySafetyStatus;
  safeUntilDate: string | null;
  plannedFreeMoney: number | null;
  safePerDay: number | null;
  confidence: MoneySafetyConfidence;
  reasons: string[];
};

function nonNegative(value: number): number {
  return Math.max(0, Number.isFinite(value) ? value : 0);
}

export function calculateMoneySafety(input: MoneySafetyInput): MoneySafetyResult {
  const balance = nonNegative(input.balance);
  const billsDue = nonNegative(input.billsDue);
  const plannedGoalContribution = nonNegative(input.plannedGoalContribution);
  const safetyBuffer = nonNegative(input.safetyBuffer);
  const daysRemaining = Math.max(1, Math.floor(Number.isFinite(input.daysRemaining) ? input.daysRemaining : 1));
  const plannedFreeMoney = Math.max(0, balance - billsDue - plannedGoalContribution - safetyBuffer);
  const obligations = billsDue + plannedGoalContribution + safetyBuffer;
  const hasIncompleteData = !input.salaryConfigured || input.dataCompleteness === "partial";
  const isOvercommitted = obligations > balance;
  const confidence: MoneySafetyConfidence = hasIncompleteData
    ? "low"
    : plannedGoalContribution > 0 || safetyBuffer > 0
      ? "high"
      : "medium";
  const status: MoneySafetyStatus = hasIncompleteData
    ? "insufficient-data"
    : isOvercommitted
      ? "attention"
      : "safe";
  const reasons: string[] = [];

  if (!input.salaryConfigured) reasons.push("Gaji bulan ini belum diatur.");
  if (input.dataCompleteness === "partial") reasons.push("Sebagian komitmen belum tercatat.");
  if (isOvercommitted) reasons.push("Komitmen yang dicatat lebih besar dari saldo saat ini.");
  if (!isOvercommitted && (billsDue > 0 || plannedGoalContribution > 0 || safetyBuffer > 0)) {
    reasons.push("Tagihan dan target yang sudah dicatat sudah dicadangkan.");
  }
  if (reasons.length === 0) reasons.push("Perkiraan memakai saldo yang tersedia saat ini.");

  return {
    status,
    safeUntilDate: null,
    plannedFreeMoney,
    safePerDay: plannedFreeMoney / daysRemaining,
    confidence,
    reasons,
  };
}
