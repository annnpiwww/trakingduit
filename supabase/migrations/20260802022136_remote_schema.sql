


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."cat_type" AS ENUM (
    'income',
    'expense'
);


ALTER TYPE "public"."cat_type" OWNER TO "postgres";


CREATE TYPE "public"."tx_source" AS ENUM (
    'manual',
    'ocr',
    'import',
    'sheet'
);


ALTER TYPE "public"."tx_source" OWNER TO "postgres";


CREATE TYPE "public"."tx_type" AS ENUM (
    'income',
    'expense',
    'transfer'
);


ALTER TYPE "public"."tx_type" OWNER TO "postgres";


CREATE TYPE "public"."wallet_type" AS ENUM (
    'cash',
    'bank',
    'ewallet',
    'credit',
    'investment'
);


ALTER TYPE "public"."wallet_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into profiles (id, name, email)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'Pengguna'), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "table_name" "text" NOT NULL,
    "row_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."audit_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNED BY "public"."audit_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."bills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric(16,2) NOT NULL,
    "due_date" "date" NOT NULL,
    "repeat" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "category_id" "uuid",
    "wallet_id" "uuid",
    "reminder_days" integer DEFAULT 3 NOT NULL,
    "last_paid_at" timestamp with time zone,
    "auto_create_tx" smallint DEFAULT 1 NOT NULL,
    "archived" smallint DEFAULT 0 NOT NULL,
    "is_installment" smallint DEFAULT 0 NOT NULL,
    "installment_total" integer,
    "installment_paid" integer,
    "installment_amount_per_period" numeric(16,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" smallint DEFAULT 0 NOT NULL,
    CONSTRAINT "bills_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "bills_repeat_check" CHECK (("repeat" = ANY (ARRAY['none'::"text", 'weekly'::"text", 'monthly'::"text", 'yearly'::"text"])))
);


ALTER TABLE "public"."bills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "amount" numeric(16,2) NOT NULL,
    "period" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "start_date" "date" NOT NULL,
    "rollover" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" smallint DEFAULT 0 NOT NULL,
    CONSTRAINT "budgets_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "budgets_period_check" CHECK (("period" = ANY (ARRAY['monthly'::"text", 'weekly'::"text"])))
);


ALTER TABLE "public"."budgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."cat_type" DEFAULT 'expense'::"public"."cat_type" NOT NULL,
    "icon" "text" DEFAULT 'ellipsis'::"text" NOT NULL,
    "color" "text" DEFAULT '#94a3b8'::"text" NOT NULL,
    "is_default" smallint DEFAULT 0 NOT NULL,
    "keywords" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" smallint DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" DEFAULT ''::"text" NOT NULL,
    "kind" "text" DEFAULT 'info'::"text" NOT NULL,
    "read" smallint DEFAULT 0 NOT NULL,
    "ref_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" smallint DEFAULT 0 NOT NULL,
    CONSTRAINT "notifications_kind_check" CHECK (("kind" = ANY (ARRAY['bill'::"text", 'budget'::"text", 'goal'::"text", 'sync'::"text", 'info'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ocr_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "image_path" "text",
    "raw_text" "text" DEFAULT ''::"text" NOT NULL,
    "parsed" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "engine" "text" DEFAULT 'tesseract'::"text" NOT NULL,
    "transaction_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" smallint DEFAULT 0 NOT NULL,
    CONSTRAINT "ocr_receipts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."ocr_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text" DEFAULT 'Pengguna'::"text" NOT NULL,
    "email" "text",
    "avatar_color" "text" DEFAULT '#0f9d76'::"text" NOT NULL,
    "currency" "text" DEFAULT 'IDR'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saving_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "target_amount" numeric(16,2) NOT NULL,
    "saved_amount" numeric(16,2) DEFAULT 0 NOT NULL,
    "deadline" "date",
    "wallet_id" "uuid",
    "color" "text" DEFAULT '#0f9d76'::"text" NOT NULL,
    "icon" "text" DEFAULT 'target'::"text" NOT NULL,
    "archived" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" smallint DEFAULT 0 NOT NULL,
    CONSTRAINT "saving_goals_target_amount_check" CHECK (("target_amount" > (0)::numeric))
);


ALTER TABLE "public"."saving_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_logs" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "target" "text" NOT NULL,
    "direction" "text" NOT NULL,
    "status" "text" NOT NULL,
    "pushed" integer DEFAULT 0 NOT NULL,
    "pulled" integer DEFAULT 0 NOT NULL,
    "message" "text" DEFAULT ''::"text" NOT NULL,
    "at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sync_logs_direction_check" CHECK (("direction" = ANY (ARRAY['push'::"text", 'pull'::"text", 'two-way'::"text"]))),
    CONSTRAINT "sync_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'error'::"text", 'partial'::"text"]))),
    CONSTRAINT "sync_logs_target_check" CHECK (("target" = ANY (ARRAY['supabase'::"text", 'google-sheet'::"text"])))
);


ALTER TABLE "public"."sync_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sync_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sync_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sync_logs_id_seq" OWNED BY "public"."sync_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."tx_type" NOT NULL,
    "amount" numeric(16,2) NOT NULL,
    "wallet_id" "uuid" NOT NULL,
    "to_wallet_id" "uuid",
    "category_id" "uuid",
    "date" "date" NOT NULL,
    "note" "text",
    "merchant" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "receipt_id" "uuid",
    "source" "public"."tx_source" DEFAULT 'manual'::"public"."tx_source" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" smallint DEFAULT 0 NOT NULL,
    CONSTRAINT "transactions_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "transfer_distinct_wallets" CHECK ((("to_wallet_id" IS NULL) OR ("to_wallet_id" <> "wallet_id"))),
    CONSTRAINT "transfer_needs_target" CHECK ((("type" <> 'transfer'::"public"."tx_type") OR ("to_wallet_id" IS NOT NULL)))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."wallet_type" DEFAULT 'cash'::"public"."wallet_type" NOT NULL,
    "initial_balance" numeric(16,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'IDR'::"text" NOT NULL,
    "color" "text" DEFAULT '#0f9d76'::"text" NOT NULL,
    "icon" "text" DEFAULT 'wallet'::"text" NOT NULL,
    "note" "text",
    "archived" smallint DEFAULT 0 NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" smallint DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."wallets" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."wallet_balances" AS
 SELECT "w"."id" AS "wallet_id",
    "w"."user_id",
    "w"."name",
    ((("w"."initial_balance" + COALESCE("sum"(
        CASE
            WHEN ("t"."type" = 'income'::"public"."tx_type") THEN "t"."amount"
            ELSE (0)::numeric
        END), (0)::numeric)) - COALESCE("sum"(
        CASE
            WHEN ("t"."type" = ANY (ARRAY['expense'::"public"."tx_type", 'transfer'::"public"."tx_type"])) THEN "t"."amount"
            ELSE (0)::numeric
        END), (0)::numeric)) + COALESCE(( SELECT "sum"("transactions"."amount") AS "sum"
           FROM "public"."transactions"
          WHERE (("transactions"."to_wallet_id" = "w"."id") AND ("transactions"."type" = 'transfer'::"public"."tx_type") AND ("transactions"."deleted" = 0))), (0)::numeric)) AS "balance"
   FROM ("public"."wallets" "w"
     LEFT JOIN "public"."transactions" "t" ON ((("t"."wallet_id" = "w"."id") AND ("t"."deleted" = 0))))
  WHERE ("w"."deleted" = 0)
  GROUP BY "w"."id", "w"."user_id", "w"."name", "w"."initial_balance";


ALTER VIEW "public"."wallet_balances" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sync_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sync_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ocr_receipts"
    ADD CONSTRAINT "ocr_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saving_goals"
    ADD CONSTRAINT "saving_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_logs"
    ADD CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("id");



CREATE INDEX "transactions_updated_idx" ON "public"."transactions" USING "btree" ("user_id", "updated_at");



CREATE INDEX "transactions_user_date_idx" ON "public"."transactions" USING "btree" ("user_id", "date" DESC);



CREATE INDEX "transactions_wallet_idx" ON "public"."transactions" USING "btree" ("wallet_id");



CREATE OR REPLACE TRIGGER "bills_set_updated_at" BEFORE UPDATE ON "public"."bills" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "budgets_set_updated_at" BEFORE UPDATE ON "public"."budgets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "categories_set_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "notifications_set_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "ocr_receipts_set_updated_at" BEFORE UPDATE ON "public"."ocr_receipts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "saving_goals_set_updated_at" BEFORE UPDATE ON "public"."saving_goals" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "transactions_set_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "wallets_set_updated_at" BEFORE UPDATE ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ocr_receipts"
    ADD CONSTRAINT "ocr_receipts_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ocr_receipts"
    ADD CONSTRAINT "ocr_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saving_goals"
    ADD CONSTRAINT "saving_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saving_goals"
    ADD CONSTRAINT "saving_goals_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sync_logs"
    ADD CONSTRAINT "sync_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_to_wallet_id_fkey" FOREIGN KEY ("to_wallet_id") REFERENCES "public"."wallets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budgets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ocr_receipts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own profile" ON "public"."profiles" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "own rows" ON "public"."audit_logs" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "own rows" ON "public"."bills" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "own rows" ON "public"."budgets" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "own rows" ON "public"."categories" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "own rows" ON "public"."notifications" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "own rows" ON "public"."ocr_receipts" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "own rows" ON "public"."saving_goals" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "own rows" ON "public"."sync_logs" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "own rows" ON "public"."transactions" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "own rows" ON "public"."wallets" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saving_goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallets" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bills" TO "anon";
GRANT ALL ON TABLE "public"."bills" TO "authenticated";
GRANT ALL ON TABLE "public"."bills" TO "service_role";



GRANT ALL ON TABLE "public"."budgets" TO "anon";
GRANT ALL ON TABLE "public"."budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."budgets" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."ocr_receipts" TO "anon";
GRANT ALL ON TABLE "public"."ocr_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."ocr_receipts" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."saving_goals" TO "anon";
GRANT ALL ON TABLE "public"."saving_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."saving_goals" TO "service_role";



GRANT ALL ON TABLE "public"."sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sync_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sync_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sync_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."wallets" TO "anon";
GRANT ALL ON TABLE "public"."wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."wallets" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_balances" TO "anon";
GRANT ALL ON TABLE "public"."wallet_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_balances" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































