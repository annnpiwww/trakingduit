import { describe, expect, it } from "vitest";
import { calculateSafeToSpend, monthlyGoalReserve } from "../../src/lib/safe-to-spend";

describe("calculateSafeToSpend", () => {
  it("reserves bills before calculating the daily safe limit", () => {
    expect(
      calculateSafeToSpend({ balance: 5_000_000, reservedBills: 1_500_000, daysRemaining: 10 }),
    ).toMatchObject({
      total: 3_500_000,
      perDay: 350_000,
      reservedBills: 1_500_000,
      reservedGoals: 0,
      safetyBuffer: 0,
      daysRemaining: 10,
      confidence: "medium",
    });
  });

  it("never promises spendable money when bills exceed balance", () => {
    expect(
      calculateSafeToSpend({ balance: 500_000, reservedBills: 1_500_000, daysRemaining: 0 }),
    ).toMatchObject({ total: 0, perDay: 0, daysRemaining: 1 });
  });

  it("reserves a fair monthly contribution for a dated goal", () => {
    expect(
      monthlyGoalReserve({ targetAmount: 1_200_000, savedAmount: 200_000, deadline: "2026-12-31" }, "2026-08"),
    ).toBe(200_000);
    expect(
      monthlyGoalReserve({ targetAmount: 1_200_000, savedAmount: 1_200_000, deadline: "2026-12-31" }, "2026-08"),
    ).toBe(0);
  });

  it("reserves explicit goal contributions and buffer and reports incomplete confidence", () => {
    expect(
      calculateSafeToSpend({
        balance: 5_000_000,
        reservedBills: 1_000_000,
        reservedGoals: 500_000,
        safetyBuffer: 250_000,
        daysRemaining: 10,
        salaryConfigured: false,
      }),
    ).toMatchObject({
      total: 3_250_000,
      perDay: 325_000,
      reservedGoals: 500_000,
      safetyBuffer: 250_000,
      confidence: "low",
    });
  });
});
