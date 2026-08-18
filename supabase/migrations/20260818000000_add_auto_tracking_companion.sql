-- Migration: 20260818000000_add_auto_tracking_companion.sql
-- Description: Add auto notification source, auto_app_identifier column for wallets, and auto_transaction_logs table.

-- ============================================================================
-- 1. Extend tx_source check constraint or enum for 'auto_notification'
-- ============================================================================
DO $$
BEGIN
  -- Handle ENUM type tx_source if it exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tx_source') THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_enum e 
      JOIN pg_type t ON e.enumtypid = t.oid 
      WHERE t.typname = 'tx_source' AND e.enumlabel = 'auto_notification'
    ) THEN
      ALTER TYPE public.tx_source ADD VALUE 'auto_notification';
    END IF;
  END IF;

  -- Handle check constraint if transactions_source_check constraint exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_source_check'
  ) THEN
    ALTER TABLE public.transactions DROP CONSTRAINT transactions_source_check;
    ALTER TABLE public.transactions ADD CONSTRAINT transactions_source_check 
      CHECK (source IN ('manual', 'ocr', 'import', 'sheet', 'auto_notification'));
  END IF;
END $$;

-- ============================================================================
-- 2. Add auto_app_identifier column to public.wallets with a partial index
-- ============================================================================
ALTER TABLE public.wallets 
  ADD COLUMN IF NOT EXISTS auto_app_identifier VARCHAR(50) NULL;

CREATE INDEX IF NOT EXISTS idx_wallets_auto_app_identifier 
  ON public.wallets (auto_app_identifier) 
  WHERE auto_app_identifier IS NOT NULL;

-- ============================================================================
-- 3. Create public.auto_transaction_logs table & RLS policies
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.auto_transaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_hash TEXT NOT NULL,
    source_app VARCHAR(50) NOT NULL,
    amount NUMERIC(16, 2) NULL,
    merchant TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT auto_transaction_logs_user_hash_key UNIQUE (user_id, notification_hash)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_auto_tx_logs_user_id 
  ON public.auto_transaction_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_auto_tx_logs_status 
  ON public.auto_transaction_logs (status);

CREATE INDEX IF NOT EXISTS idx_auto_tx_logs_created_at 
  ON public.auto_transaction_logs (created_at DESC);

-- Enable RLS
ALTER TABLE public.auto_transaction_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if present
DROP POLICY IF EXISTS "Users can view their own auto transaction logs" ON public.auto_transaction_logs;
DROP POLICY IF EXISTS "Users can insert their own auto transaction logs" ON public.auto_transaction_logs;

-- RLS Policies for authenticated users to SELECT and INSERT their own logs
CREATE POLICY "Users can view their own auto transaction logs" 
  ON public.auto_transaction_logs 
  FOR SELECT 
  TO authenticated 
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own auto transaction logs" 
  ON public.auto_transaction_logs 
  FOR INSERT 
  TO authenticated 
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Grants
GRANT ALL ON TABLE public.auto_transaction_logs TO authenticated;
GRANT ALL ON TABLE public.auto_transaction_logs TO service_role;
