import { describe, expect, it, vi } from "vitest";
import { checkPersistentRateLimit } from "../../src/lib/rate-limit";

describe("checkPersistentRateLimit", () => {
  it("uses the database decision when the service-role RPC is available", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ allowed: false, remaining: 0, retry_after_seconds: 42 }],
      error: null,
    });

    const result = await checkPersistentRateLimit({
      key: "login:198.51.100.7:user@example.com",
      maxRequests: 5,
      windowMs: 300_000,
      adminClient: { rpc },
    });

    const rpcArgs = rpc.mock.calls[0]?.[1] as { p_key?: unknown };
    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", {
      p_key: expect.stringMatching(/^[a-f0-9]{64}$/),
      p_limit: 5,
      p_window_seconds: 300,
    });
    expect(rpcArgs.p_key).not.toContain("user@example.com");
    expect(result).toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 42 });
  });

  it("falls back to the local limiter when the RPC is unavailable", async () => {
    const result = await checkPersistentRateLimit({
      key: "local-key",
      maxRequests: 1,
      windowMs: 60_000,
      adminClient: null,
    });

    expect(result.allowed).toBe(true);
    const second = await checkPersistentRateLimit({
      key: "local-key",
      maxRequests: 1,
      windowMs: 60_000,
      adminClient: null,
    });
    expect(second.allowed).toBe(false);
  });
});
