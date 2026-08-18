import { describe, it, expect } from "vitest";
import { parseAutoTransactionPayload } from "../../src/lib/hooks/useAutoTransactionRealtime";

describe("useAutoTransactionRealtime - parseAutoTransactionPayload", () => {
  it("correctly parses expense transaction from BRImo auto notification", () => {
    const rawPayload = {
      id: "tx-123",
      amount: 150000,
      merchant: "WARUNG MAKAN",
      note: "Auto-recorded via BRImo",
      type: "expense",
      source: "auto_notification",
    };

    const notif = parseAutoTransactionPayload(rawPayload);

    expect(notif.title).toBe("✓ Auto-Catat Transaksi");
    expect(notif.amount).toBe(150000);
    expect(notif.merchant).toBe("WARUNG MAKAN");
    expect(notif.sourceApp).toBe("BRImo");
    expect(notif.description).toContain("di WARUNG MAKAN");
    expect(notif.description).toContain("(BRImo)");
    expect(notif.actionUrl).toBe("/dashboard?edit=tx-123");
  });

  it("correctly strips 'Auto-recorded via ' prefix from note", () => {
    const rawPayload = {
      id: "tx-456",
      amount: 50000,
      merchant: "MINIMARKET",
      note: "Auto-recorded via BCA Mobile",
      type: "expense",
      source: "auto_notification",
    };

    const notif = parseAutoTransactionPayload(rawPayload);

    expect(notif.sourceApp).toBe("BCA Mobile");
    expect(notif.description).toContain("(BCA Mobile)");
  });

  it("handles missing merchant and default bank label gracefully", () => {
    const rawPayload = {
      id: "tx-789",
      amount: 250000,
      merchant: null,
      note: null,
      type: "income",
      source: "auto_notification",
    };

    const notif = parseAutoTransactionPayload(rawPayload);

    expect(notif.sourceApp).toBe("Bank");
    expect(notif.merchant).toBeNull();
    expect(notif.description).not.toContain("di ");
    expect(notif.description).toContain("(Bank)");
  });
});
