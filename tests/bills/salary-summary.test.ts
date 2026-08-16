import { describe, expect, it } from "vitest";
import { getBillPaymentTransactionId, getSalarySummary } from "../../src/lib/bill-metrics";

describe("bill metrics", () => {
  it("builds a stable payment transaction key per bill and cycle", () => {
    expect(getBillPaymentTransactionId("bill-1", "2026-08-16")).toBe(
      "bill-payment-bill-1-2026-08-16",
    );
  });

  describe("getSalarySummary", () => {
  it("treats a missing or zero salary as not configured", () => {
    expect(getSalarySummary(undefined, 1_500_000)).toEqual({
      configured: false,
      remaining: null,
      percent: null,
    });
    expect(getSalarySummary(0, 1_500_000)).toEqual({
      configured: false,
      remaining: null,
      percent: null,
    });
  });

  it("calculates remaining salary and bill usage for a positive salary", () => {
    expect(getSalarySummary(5_000_000, 1_500_000)).toEqual({
      configured: true,
      remaining: 3_500_000,
      percent: 30,
    });
  });
  });
});
