-- ============================================================
-- TrackingDuit — FIX SYNC: apply ke Supabase SQL Editor
-- Isi: (1) kolom cicilan di bills, (2) tabel debts (utang piutang)
-- Jalankan SEMUA blok ini sekali, lalu notif PostgREST reload schema.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Kolom cicilan di tabel bills
-- ------------------------------------------------------------
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS is_installment smallint DEFAULT 0 NOT NULL;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS installment_total integer;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS installment_paid integer;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS installment_amount_per_period numeric(16, 2);

-- ------------------------------------------------------------
-- 2. Tabel debts (utang piutang)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."debts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "user_id" "uuid" NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "person" "text" NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric(16,2) NOT NULL,
    "paid_amount" numeric(16,2) DEFAULT 0 NOT NULL,
    "due_date" "date",
    "note" "text",
    "wallet_id" "uuid" REFERENCES public.wallets(id) ON DELETE SET NULL,
    "auto_tx" smallint DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" smallint DEFAULT 0 NOT NULL,
    CONSTRAINT debts_type_check CHECK (("type" = ANY (ARRAY['payable'::"text", 'receivable'::"text"]))),
    CONSTRAINT debts_amount_check CHECK (("amount" > (0)::numeric)),
    CONSTRAINT debts_paid_amount_check CHECK (("paid_amount" >= (0)::numeric))
);

ALTER TABLE "public"."debts" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own rows" ON "public"."debts";
CREATE POLICY "own rows" ON "public"."debts" FOR ALL
  USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));

DROP TRIGGER IF EXISTS "debts_set_updated_at" ON "public"."debts";
CREATE TRIGGER "debts_set_updated_at" BEFORE UPDATE ON "public"."debts"
  FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

GRANT ALL ON TABLE "public"."debts" TO "anon";
GRANT ALL ON TABLE "public"."debts" TO "authenticated";
GRANT ALL ON TABLE "public"."debts" TO "service_role";

-- ------------------------------------------------------------
-- 3. Minta PostgREST muat ulang schema cache (fix error "could
--    not find column ... in the schema cache" tanpa nunggu).
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
