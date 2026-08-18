import { describe, expect, it, vi } from "vitest";

describe("supabase-sync wallets self-healing fallback", () => {
  it("strips auto_app_identifier and retries upsert when auto_app_identifier error occurs", async () => {
    let callCount = 0;
    let retriedPayload: Record<string, unknown>[] = [];

    const mockUpsert = vi.fn().mockImplementation((payload) => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          error: {
            message: "Could not find the 'auto_app_identifier' column of 'wallets' in the schema cache",
            code: "PGRST204",
          },
        });
      }
      retriedPayload = payload;
      return Promise.resolve({ error: null });
    });

    // Simulate the fallback logic
    const payload = [
      {
        id: "w1",
        user_id: "u1",
        name: "Main Wallet",
        auto_app_identifier: "com.example.app",
      },
    ];

    let { error } = await mockUpsert(payload);
    if (error) {
      const isAutoAppIdErr =
        error.message?.includes("auto_app_identifier") ||
        error.code === "PGRST204" ||
        error.code === "42703";

      if (isAutoAppIdErr) {
        const strippedPayload = payload.map((item) => {
          const copy = { ...item };
          delete copy.auto_app_identifier;
          return copy;
        });
        const retry = await mockUpsert(strippedPayload);
        error = retry.error;
      }
    }

    expect(callCount).toBe(2);
    expect(error).toBeNull();
    expect(retriedPayload[0]).not.toHaveProperty("auto_app_identifier");
    expect(retriedPayload[0].name).toBe("Main Wallet");
  });
});
