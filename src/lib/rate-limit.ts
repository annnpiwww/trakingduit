import { createHash } from "node:crypto";
import { supabaseAdmin } from "./supabase";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
  now?: () => number;
};

type Entry = {
  count: number;
  resetAt: number;
};

type LocalLimiter = ReturnType<typeof createRateLimiter>;
const persistentFallbacks = new Map<string, LocalLimiter>();

function getPersistentFallback(maxRequests: number, windowMs: number): LocalLimiter {
  const configKey = `${maxRequests}:${windowMs}`;
  const existing = persistentFallbacks.get(configKey);
  if (existing) return existing;
  const created = createRateLimiter({ maxRequests, windowMs });
  persistentFallbacks.set(configKey, created);
  return created;
}

/**
 * Small in-process limiter for a single runtime instance.
 *
 * It is intentionally dependency-free so it can protect auth routes even when
 * no external rate-limit store is configured. The caller should still add a
 * durable edge/WAF limiter for multi-instance deployments.
 */
export interface RateLimitRpcClient {
  rpc: (functionName: string, args: Record<string, unknown>) => Promise<{
    data: unknown;
    error: unknown;
  }>;
}

export async function checkPersistentRateLimit({
  key,
  maxRequests,
  windowMs,
  adminClient,
}: {
  key: string;
  maxRequests: number;
  windowMs: number;
  adminClient?: RateLimitRpcClient | null;
}): Promise<RateLimitResult> {
  const fallback = getPersistentFallback(maxRequests, windowMs);
  const bucketKey = createHash("sha256").update(key).digest("hex");
  const client = adminClient === undefined ? (supabaseAdmin?.() as RateLimitRpcClient | null) : adminClient;

  if (!client) return fallback.check(bucketKey);

  try {
    const { data, error } = await client.rpc("consume_rate_limit", {
      p_key: bucketKey,
      p_limit: maxRequests,
      p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
    });
    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row && typeof row === "object") {
        const result = row as Record<string, unknown>;
        if (
          typeof result.allowed === "boolean"
          && typeof result.remaining === "number"
          && typeof result.retry_after_seconds === "number"
        ) {
          return {
            allowed: result.allowed,
            remaining: Math.max(0, Math.floor(result.remaining)),
            retryAfterSeconds: Math.max(0, Math.ceil(result.retry_after_seconds)),
          };
        }
      }
    }
  } catch {
    // Local-only or partially configured environments still get a warm-instance guard.
  }

  return fallback.check(bucketKey);
}

export function createRateLimiter({ maxRequests, windowMs, now = Date.now }: RateLimitOptions) {
  if (!Number.isInteger(maxRequests) || maxRequests <= 0) {
    throw new Error("maxRequests must be a positive integer");
  }
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error("windowMs must be positive");
  }

  const entries = new Map<string, Entry>();

  function prune(timestamp: number) {
    for (const [key, entry] of entries) {
      if (entry.resetAt <= timestamp) entries.delete(key);
    }
  }

  return {
    check(key: string): RateLimitResult {
      const timestamp = now();
      prune(timestamp);
      const current = entries.get(key);

      if (!current || current.resetAt <= timestamp) {
        entries.set(key, { count: 1, resetAt: timestamp + windowMs });
        return {
          allowed: true,
          remaining: maxRequests - 1,
          retryAfterSeconds: Math.ceil(windowMs / 1000),
        };
      }

      if (current.count >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - timestamp) / 1000)),
        };
      }

      current.count += 1;
      return {
        allowed: true,
        remaining: maxRequests - current.count,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - timestamp) / 1000)),
      };
    },
    clear() {
      entries.clear();
    },
  };
}
