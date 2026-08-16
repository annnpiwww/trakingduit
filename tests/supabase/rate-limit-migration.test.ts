import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260816040210_add_persistent_rate_limit.sql",
);

describe("persistent rate-limit migration", () => {
  it("creates an atomic bucket function with bounded inputs", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("create table if not exists public.rate_limit_buckets");
    expect(sql).toContain("on conflict (key) do update");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public");
    expect(sql).toContain("p_window_seconds");
  });

  it("does not expose buckets or the function to browser roles", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("revoke all on table public.rate_limit_buckets from anon, authenticated;");
    expect(sql).toContain("revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;");
    expect(sql).toContain("grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;");
  });
});
