import { describe, expect, it } from "vitest";
import { calculateMoneySafety } from "../../src/lib/money-safety";

describe("calculateMoneySafety", () => {
  it("marks missing salary as insufficient data instead of inventing a normal month", () => {
    const result = calculateMoneySafety({
      balance: 3_000_000,
      daysRemaining: 10,
      billsDue: 1_000_000,
      plannedGoalContribution: 0,
      safetyBuffer: 0,
      salaryConfigured: false,
      dataCompleteness: "partial",
    });

    expect(result.status).toBe("insufficient-data");
    expect(result.confidence).toBe("low");
    expect(result.plannedFreeMoney).toBe(2_000_000);
    expect(result.safePerDay).toBe(200_000);
    expect(result.reasons).toContain("Gaji bulan ini belum diatur.");
  });

  it("marks obligations above balance as attention without negative daily math", () => {
    const result = calculateMoneySafety({
      balance: 500_000,
      daysRemaining: 0,
      billsDue: 1_500_000,
      plannedGoalContribution: 0,
      safetyBuffer: 0,
      salaryConfigured: true,
      dataCompleteness: "full",
    });

    expect(result.status).toBe("attention");
    expect(result.plannedFreeMoney).toBe(0);
    expect(result.safePerDay).toBe(0);
    expect(result.reasons).toContain("Komitmen yang dicatat lebih besar dari saldo saat ini.");
  });

  it("returns deterministic normal-month numbers and explains reservations", () => {
    const result = calculateMoneySafety({
      balance: 5_000_000,
      daysRemaining: 10,
      billsDue: 1_000_000,
      plannedGoalContribution: 500_000,
      safetyBuffer: 250_000,
      salaryConfigured: true,
      dataCompleteness: "full",
    });

    expect(result).toMatchObject({
      status: "safe",
      confidence: "high",
      plannedFreeMoney: 3_250_000,
      safePerDay: 325_000,
    });
    expect(result.reasons).toContain("Tagihan dan target yang sudah dicatat sudah dicadangkan.");
  });
});
