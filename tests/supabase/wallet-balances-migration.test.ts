import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260816033933_fix_wallet_balances_rls.sql",
);

const schemaPath = resolve(process.cwd(), "supabase/schema.sql");

describe("wallet_balances isolation migration", () => {
  it("uses invoker security and scopes both wallet and transaction rows", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("with (security_invoker = true)");
    expect(sql).toContain("w.user_id = (select auth.uid())");
    expect(sql).toContain("t.user_id = (select auth.uid())");
    expect(sql).toContain("incoming.user_id = (select auth.uid())");
  });

  it("revokes anonymous access and restores select-only authenticated access", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("revoke all on table public.wallet_balances from anon;");
    expect(sql).toContain("revoke all on table public.wallet_balances from authenticated;");
    expect(sql).toContain("grant select on table public.wallet_balances to authenticated;");
  });

  it("keeps the canonical schema aligned with the migration", () => {
    const sql = readFileSync(schemaPath, "utf8");
    expect(sql).toContain("with (security_invoker = true)");
    expect(sql).toContain("w.user_id = (select auth.uid())");
    expect(sql).toContain("t.user_id = (select auth.uid())");
    expect(sql).toContain("revoke all on table wallet_balances from anon;");
  });
});
