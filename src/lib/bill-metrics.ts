import type { Bill } from "./types";

export type SalarySummary = {
  configured: boolean;
  remaining: number | null;
  percent: number | null;
};

export function getBillPaymentTransactionId(billId: string, cycleKey: string): string {
  return `bill-payment-${billId}-${cycleKey}`;
}

export function isBillPaidForCycle(bill: Bill, today: string): boolean {
  if (!bill.last_paid_at) return false;
  const paidDate = bill.last_paid_at.slice(0, 10);
  if (paidDate >= bill.due_date) return true;

  const cycleStart = new Date(bill.due_date);
  switch (bill.repeat) {
    case "weekly":
      cycleStart.setDate(cycleStart.getDate() - 7);
      break;
    case "monthly":
      cycleStart.setMonth(cycleStart.getMonth() - 1);
      break;
    case "yearly":
      cycleStart.setFullYear(cycleStart.getFullYear() - 1);
      break;
    default:
      return false;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const cycleStartKey = `${cycleStart.getFullYear()}-${pad(cycleStart.getMonth() + 1)}-${pad(cycleStart.getDate())}`;
  return today < cycleStartKey || paidDate >= today;
}

export function getSalarySummary(
  salaryAmount: number | null | undefined,
  totalBills: number,
): SalarySummary {
  if (!salaryAmount || salaryAmount <= 0) {
    return { configured: false, remaining: null, percent: null };
  }

  return {
    configured: true,
    remaining: salaryAmount - totalBills,
    percent: (totalBills / salaryAmount) * 100,
  };
}
