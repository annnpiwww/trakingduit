import type { Bill } from "./types";

export type SalarySummary = {
  configured: boolean;
  remaining: number | null;
  percent: number | null;
};

export function stringToUUID(str: string): string {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  const next = () => {
    let t = (h += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };

  const hex1 = next().toString(16).padStart(8, "0");
  const hex2 = next().toString(16).padStart(8, "0");
  const hex3 = next().toString(16).padStart(8, "0");
  const hex4 = next().toString(16).padStart(8, "0");

  const hex = (hex1 + hex2 + hex3 + hex4).slice(0, 32);

  const part1 = hex.slice(0, 8);
  const part2 = hex.slice(8, 12);
  const part3 = `4${hex.slice(13, 16)}`;
  const variantChar = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const part4 = `${variantChar}${hex.slice(17, 20)}`;
  const part5 = hex.slice(20, 32);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`.toLowerCase();
}

export function getBillPaymentTransactionId(billId: string, cycleKey: string): string {
  return stringToUUID(billId + cycleKey);
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
