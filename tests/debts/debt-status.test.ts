import { describe, expect, it } from "vitest";
import { getDebtDueLabel } from "../../src/lib/debt-metrics";

describe("getDebtDueLabel", () => {
  it("uses an explicit label when no due date is configured", () => {
    expect(getDebtDueLabel(null, false, false)).toBe("Tanpa jatuh tempo");
  });

  it("preserves settled, overdue, today, and future labels", () => {
    expect(getDebtDueLabel(10, true, false)).toBe("Lunas");
    expect(getDebtDueLabel(-2, false, true)).toBe("Telat");
    expect(getDebtDueLabel(0, false, false)).toBe("Hari ini");
    expect(getDebtDueLabel(3, false, false)).toBe("3 hari lagi");
  });
});
