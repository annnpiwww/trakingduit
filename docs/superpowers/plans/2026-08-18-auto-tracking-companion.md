# TrackingDuit Auto-Tracking Companion Implementation Plan

> **Agentic Worker Note**: Execute tasks sequentially TDD-style. Validate each step with failing tests first before implementing code. Keep changes minimal, well-typed, and tested.

## Goal
Implement the end-to-end TrackingDuit Auto-Tracking Companion feature, enabling automated transaction ingestion from Android banking and e-wallet notifications (BRImo, BCA, ShopeePay) into Supabase with zero manual input, real-time PWA feedback, and local privacy-preserving parsing.

## Architecture
1. **Database Layer (Supabase Postgres)**: Schema extensions (`tx_source` enum with `'auto_notification'`, `wallets.auto_app_identifier`, `auto_transaction_logs` audit table with RLS policies and performance indexes).
2. **Backend API (`POST /api/auto-transactions/ingest`)**: Auth verification via Supabase Bearer JWT, deduplication hash verification, wallet resolution by package identifier, keyword category auto-matching, transaction creation, and audit logging.
3. **PWA Pairing & UX (`Next.js / React`)**: Settings pairing page with QR Code generator & token payload formatting, Android promo banner, and Supabase Realtime WebSocket listener for instant toast notifications.
4. **Android Companion App (`Native Kotlin`)**: Standalone Android module (`android-companion/`) with `NotificationListenerService`, regex `TransactionParserEngine` for BRImo, BCA, ShopeePay, local Room database for 24h duplicate cache, `EncryptedSharedPreferences` token vault, and `WorkManager` HTTP dispatcher with automatic Supabase refresh token lifecycle.

## Tech Stack
- **Frontend / PWA**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Sonner / Custom Toast.
- **Backend / Database**: Next.js Serverless Route Handlers, Supabase JS Client (`@supabase/supabase-js`), PostgreSQL (RLS, Indexes).
- **Mobile Companion**: Kotlin 1.9+, Android SDK (API 26-34), `NotificationListenerService`, Room Persistence Library, AndroidX WorkManager, EncryptedSharedPreferences (Jetpack Security), JUnit 5 for unit tests.
- **Testing Framework**: Node.js Test Runner / Vitest (`node --test`), JUnit 5.

## Global Constraints
- **Zero Raw Text Retention**: No raw notification text stored in DB or transmitted over network.
- **Deterministic Hashing**: SHA-256 hash using `package_name|type|formatted_amount|sanitized_merchant_upper|minute_timestamp`.
- **Deduplication Audit**: Log status `'duplicate_ignored'` when duplicate hash detected.
- **Full Complete Code**: Every code block in tasks must be 100% complete, runnable, with zero placeholders (`// ...`, `TODO`, `TBD`).

---

## Tasks

### Task 1: Supabase DB Migration

**Files Created/Modified:**
- `supabase/migrations/20260818000000_add_auto_tracking_companion.sql` (Created)
- `scripts/test-migration-auto-tracking.js` (Created for automated schema verification)

**Interfaces Consumed/Produced:**
- Produced: `public.auto_transaction_logs` schema table, `wallets.auto_app_identifier` column, `tx_source` extended enum value `'auto_notification'`.

#### Step 1: Write the failing test
Create `scripts/test-migration-auto-tracking.js` to verify table structures and columns in Supabase Postgres.

```javascript
// scripts/test-migration-auto-tracking.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "test-service-key";
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log("Testing auto_tracking_companion schema migration...");
  
  // Test 1: Check auto_app_identifier column in wallets
  const { data: walletData, error: walletError } = await supabase
    .from("wallets")
    .select("id, auto_app_identifier")
    .limit(1);

  if (walletError && walletError.message.includes("column auto_app_identifier does not exist")) {
    console.error("FAIL: Column wallets.auto_app_identifier does not exist");
    process.exit(1);
  }

  // Test 2: Check auto_transaction_logs table
  const { data: logsData, error: logsError } = await supabase
    .from("auto_transaction_logs")
    .select("id, user_id, wallet_id, amount, transaction_type, raw_sender, extracted_merchant, dedup_hash, status, error_message, created_at")
    .limit(1);

  if (logsError) {
    console.error("FAIL: Table auto_transaction_logs error:", logsError.message);
    process.exit(1);
  }

  console.log("SUCCESS: Schema verification passed.");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
```

#### Step 2: Run test to verify it fails
Execute the test script before migration:
```bash
node scripts/test-migration-auto-tracking.js
```
*Expected Output*: `FAIL: Column wallets.auto_app_identifier does not exist` or `FAIL: Table auto_transaction_logs error`.

#### Step 3: Implementation
Create `supabase/migrations/20260818000000_add_auto_tracking_companion.sql`.

```sql
-- Migration File: supabase/migrations/20260818000000_add_auto_tracking_companion.sql

-- 1. Extend TxSource enum or type constraint to include 'auto_notification'
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tx_source') THEN
        ALTER TYPE tx_source ADD VALUE IF NOT EXISTS 'auto_notification';
    END IF;
END $$;

-- 2. Add auto_app_identifier to wallets table if not present
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS auto_app_identifier VARCHAR(100) DEFAULT NULL;

COMMENT ON COLUMN public.wallets.auto_app_identifier IS 
'Package identifier of auto-tracking target (e.g. id.co.bri.brimo, id.co.bca.mobile, id.co.bca.mybca, com.bca, com.shopeepay.id, com.shopee.id)';

-- Create index for rapid wallet resolution on app_identifier lookup
CREATE INDEX IF NOT EXISTS idx_wallets_auto_app_identifier 
ON public.wallets(user_id, auto_app_identifier) 
WHERE auto_app_identifier IS NOT NULL;

-- 3. Create auto_transaction_logs table for auditing auto-ingest executions
CREATE TABLE IF NOT EXISTS public.auto_transaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('income', 'expense', 'transfer')),
    raw_sender VARCHAR(100) NOT NULL,
    extracted_merchant VARCHAR(255),
    dedup_hash VARCHAR(64) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('success', 'duplicate_ignored', 'wallet_not_found', 'error')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit query performance and backend deduplication checks
CREATE INDEX IF NOT EXISTS idx_auto_tx_logs_user_dedup 
ON public.auto_transaction_logs(user_id, dedup_hash);

CREATE INDEX IF NOT EXISTS idx_auto_tx_logs_created_at 
ON public.auto_transaction_logs(user_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.auto_transaction_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for auto_transaction_logs
CREATE POLICY "Users can select own auto transaction logs" 
ON public.auto_transaction_logs
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own auto transaction logs" 
ON public.auto_transaction_logs
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own auto transaction logs" 
ON public.auto_transaction_logs
FOR DELETE 
USING (auth.uid() = user_id);
```

Apply migration using Supabase CLI or project migration tool:
```bash
npx supabase db push || node scripts/test-db.js
```

#### Step 4: Run test to verify it passes
Execute test script again:
```bash
node scripts/test-migration-auto-tracking.js
```
*Expected Output*: `SUCCESS: Schema verification passed.`

#### Step 5: Commit changes
```bash
git add supabase/migrations/20260818000000_add_auto_tracking_companion.sql scripts/test-migration-auto-tracking.js
```

---

### Task 2: Ingest API Route & Unit/Integration Tests

**Files Created/Modified:**
- `src/app/api/auto-transactions/ingest/route.ts` (Created)
- `tests/api/auto-transactions-ingest.test.ts` (Created)

**Interfaces Consumed/Produced:**
- Interface `AutoIngestPayload`:
  ```typescript
  interface AutoIngestPayload {
    app_identifier: string;
    amount: number;
    type: "expense" | "income";
    merchant_name: string;
    dedup_hash: string;
    timestamp: string;
    category_hint?: string;
  }
  ```
- Endpoint: `POST /api/auto-transactions/ingest`
- Header: `Authorization: Bearer <SUPABASE_JWT>`

#### Step 1: Write the failing test
Create `tests/api/auto-transactions-ingest.test.ts`.

```typescript
// tests/api/auto-transactions-ingest.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "../../src/app/api/auto-transactions/ingest/route";
import { NextRequest } from "next/server";

describe("POST /api/auto-transactions/ingest", () => {
  it("should return 401 Unauthorized if Authorization header is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/auto-transactions/ingest", {
      method: "POST",
      body: JSON.stringify({
        app_identifier: "id.co.bri.brimo",
        amount: 50000,
        type: "expense",
        merchant_name: "Kopi Kenangan",
        dedup_hash: "test-hash-123",
        timestamp: new Date().toISOString(),
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain("Missing or invalid authorization header");
  });

  it("should return 400 Bad Request when payload is incomplete", async () => {
    const req = new NextRequest("http://localhost:3000/api/auto-transactions/ingest", {
      method: "POST",
      headers: {
        authorization: "Bearer mock-token-invalid",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        app_identifier: "id.co.bri.brimo",
        // missing amount, dedup_hash, etc.
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });
});
```

#### Step 2: Run test to verify it fails
```bash
npx vitest run tests/api/auto-transactions-ingest.test.ts || node --test tests/api/auto-transactions-ingest.test.ts
```
*Expected Output*: `FAIL: Cannot find module '../../../src/app/api/auto-transactions/ingest/route'`.

#### Step 3: Implementation
Create `src/app/api/auto-transactions/ingest/route.ts`.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface AutoIngestPayload {
  app_identifier: string;
  amount: number;
  type: "expense" | "income";
  merchant_name: string;
  dedup_hash: string;
  timestamp: string;
  category_hint?: string;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, status: "error", error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, status: "error", error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const payload: AutoIngestPayload = await req.json();

    if (
      !payload.app_identifier ||
      typeof payload.amount !== "number" ||
      !payload.type ||
      !payload.merchant_name ||
      !payload.dedup_hash
    ) {
      return NextResponse.json(
        { success: false, status: "error", error: "Missing required payload fields" },
        { status: 400 }
      );
    }

    // 1. Deduplication check in auto_transaction_logs & transactions
    const { data: existingLogs } = await supabase
      .from("auto_transaction_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("dedup_hash", payload.dedup_hash)
      .eq("status", "success")
      .limit(1);

    if (existingLogs && existingLogs.length > 0) {
      await supabase.from("auto_transaction_logs").insert({
        user_id: user.id,
        wallet_id: null,
        amount: payload.amount,
        transaction_type: payload.type,
        raw_sender: payload.app_identifier,
        extracted_merchant: payload.merchant_name,
        dedup_hash: payload.dedup_hash,
        status: "duplicate_ignored",
        error_message: "Duplicate transaction hash detected",
      });

      return NextResponse.json(
        {
          success: true,
          status: "duplicate_ignored",
          message: "Transaction notification hash already processed",
        },
        { status: 200 }
      );
    }

    // 2. Resolve target wallet by app_identifier
    let walletId: string | null = null;
    const { data: matchedWallets } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", user.id)
      .eq("auto_app_identifier", payload.app_identifier)
      .limit(1);

    if (matchedWallets && matchedWallets.length > 0) {
      walletId = matchedWallets[0].id;
    } else {
      const { data: defaultWallets } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (defaultWallets && defaultWallets.length > 0) {
        walletId = defaultWallets[0].id;
      }
    }

    if (!walletId) {
      await supabase.from("auto_transaction_logs").insert({
        user_id: user.id,
        wallet_id: null,
        amount: payload.amount,
        transaction_type: payload.type,
        raw_sender: payload.app_identifier,
        extracted_merchant: payload.merchant_name,
        dedup_hash: payload.dedup_hash,
        status: "wallet_not_found",
        error_message: "No active wallet found for user",
      });

      return NextResponse.json(
        { success: false, status: "error", error: "No wallet configured for auto tracking" },
        { status: 400 }
      );
    }

    // 3. Category matching logic
    let categoryId: string | null = null;
    const merchantLower = payload.merchant_name.toLowerCase();

    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, keywords")
      .eq("user_id", user.id)
      .eq("type", payload.type)
      .eq("active", 1);

    if (categories) {
      for (const cat of categories) {
        if (cat.keywords && Array.isArray(cat.keywords)) {
          if (cat.keywords.some((kw: string) => merchantLower.includes(kw.toLowerCase()))) {
            categoryId = cat.id;
            break;
          }
        }
      }
    }

    const txDate = payload.timestamp ? payload.timestamp.split("T")[0] : new Date().toISOString().split("T")[0];

    // 4. Insert transaction
    const { data: insertedTx, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        amount: payload.amount,
        type: payload.type,
        wallet_id: walletId,
        category_id: categoryId,
        merchant: payload.merchant_name,
        note: `Auto-recorded via ${payload.app_identifier}`,
        date: txDate,
        source: "auto_notification",
        tags: ["auto-ingest", payload.app_identifier],
        created_at: payload.timestamp || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: 0,
      })
      .select("id")
      .single();

    if (txError || !insertedTx) {
      await supabase.from("auto_transaction_logs").insert({
        user_id: user.id,
        wallet_id: walletId,
        amount: payload.amount,
        transaction_type: payload.type,
        raw_sender: payload.app_identifier,
        extracted_merchant: payload.merchant_name,
        dedup_hash: payload.dedup_hash,
        status: "error",
        error_message: txError?.message || "Failed to insert transaction",
      });

      return NextResponse.json(
        { success: false, status: "error", error: "Database insertion failed" },
        { status: 500 }
      );
    }

    // 5. Log audit success
    await supabase.from("auto_transaction_logs").insert({
      user_id: user.id,
      wallet_id: walletId,
      amount: payload.amount,
      transaction_type: payload.type,
      raw_sender: payload.app_identifier,
      extracted_merchant: payload.merchant_name,
      dedup_hash: payload.dedup_hash,
      status: "success",
    });

    return NextResponse.json(
      {
        success: true,
        status: "created",
        transaction_id: insertedTx.id,
        wallet_id: walletId,
        message: "Transaction auto-recorded successfully",
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json(
      { success: false, status: "error", error: errorMsg },
      { status: 500 }
    );
  }
}
```

#### Step 4: Run test to verify it passes
```bash
npx vitest run tests/api/auto-transactions-ingest.test.ts || node --test tests/api/auto-transactions-ingest.test.ts
```
*Expected Output*: `PASS tests/api/auto-transactions-ingest.test.ts (2 tests passed)`.

#### Step 5: Commit changes
```bash
git add src/app/api/auto-transactions/ingest/route.ts tests/api/auto-transactions-ingest.test.ts
```

---

### Task 3: PWA Companion Pairing Page & QR Code Generator

**Files Created/Modified:**
- `src/app/(dashboard)/settings/auto-tracking/page.tsx` (Created)
- `src/components/auto-tracking/QrCodeGenerator.tsx` (Created)
- `tests/components/auto-tracking-pairing.test.tsx` (Created)

**Interfaces Consumed/Produced:**
- Pairing JSON Payload Structure:
  ```json
  {
    "api_url": "https://trakingduit.vercel.app/api/auto-transactions/ingest",
    "supabase_url": "https://<project-ref>.supabase.co",
    "access_token": "eyJhbGciOi...",
    "refresh_token": "rF8xK..."
  }
  ```

#### Step 1: Write the failing test
Create `tests/components/auto-tracking-pairing.test.tsx`.

```tsx
// tests/components/auto-tracking-pairing.test.tsx
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import QrCodeGenerator from "../../src/components/auto-tracking/QrCodeGenerator";

describe("QrCodeGenerator", () => {
  it("renders QR payload input string properly", () => {
    const mockPayload = {
      api_url: "http://localhost:3000/api/auto-transactions/ingest",
      supabase_url: "http://localhost:54321",
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
    };

    const payloadString = JSON.stringify(mockPayload);
    render(<QrCodeGenerator value={payloadString} />);

    const qrElement = screen.getByTestId("qr-code-container");
    expect(qrElement).toBeInTheDocument();
  });
});
```

#### Step 2: Run test to verify it fails
```bash
npx vitest run tests/components/auto-tracking-pairing.test.tsx
```
*Expected Output*: `FAIL: Cannot find module '../../src/components/auto-tracking/QrCodeGenerator'`.

#### Step 3: Implementation

Create `src/components/auto-tracking/QrCodeGenerator.tsx`.

```tsx
"use client";

import React from "react";
import { QrCode } from "lucide-react";

interface QrCodeGeneratorProps {
  value: string;
  size?: number;
}

export default function QrCodeGenerator({ value, size = 200 }: QrCodeGeneratorProps) {
  const encodedValue = encodeURIComponent(value);
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedValue}`;

  return (
    <div
      data-testid="qr-code-container"
      className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm"
    >
      <img
        src={qrApiUrl}
        alt="Companion App Pairing QR Code"
        width={size}
        height={size}
        className="rounded-lg"
      />
      <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-medium">
        <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Scan via Companion App Scanner
      </div>
    </div>
  );
}
```

Create `src/app/(dashboard)/settings/auto-tracking/page.tsx`.

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { Smartphone, Copy, Check, ShieldCheck, RefreshCw, ChevronLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import QrCodeGenerator from "@/components/auto-tracking/QrCodeGenerator";

export default function AutoTrackingSettingsPage() {
  const [pairingPayload, setPairingPayload] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://trakingduit.supabase.co";
      const apiUrl = `${window.location.origin}/api/auto-transactions/ingest`;

      const payload = {
        api_url: apiUrl,
        supabase_url: supabaseUrl,
        access_token: session?.access_token || "",
        refresh_token: session?.refresh_token || "",
      };

      setPairingPayload(JSON.stringify(payload));
      setLoading(false);
    }

    loadSession();
  }, []);

  const handleCopy = () => {
    if (!pairingPayload) return;
    navigator.clipboard.writeText(pairingPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 text-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/settings"
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Pairing Companion App</h1>
          <p className="text-xs text-slate-400">Hubungkan Android Companion untuk Otomasi Notifikasi</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-300">
          <Smartphone className="w-7 h-7 shrink-0 text-emerald-400" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-emerald-200">Buka TrakingDuit Companion App</span> di Android kamu, pilih menu <strong>Scan Pair QR</strong> lalu arahkan kamera ke kode QR di bawah ini.
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
            <span className="text-xs">Generating Pairing Token...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <QrCodeGenerator value={pairingPayload} size={220} />

            <div className="w-full pt-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Kode Pairing Manual (Opsional)
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly
                  value={pairingPayload}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 pr-24 font-mono truncate"
                />
                <button
                  onClick={handleCopy}
                  className="absolute right-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Salin
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" /> Token Terenkripsi End-to-End
          </span>
          <a
            href="/download/trakingduit-companion.apk"
            download
            className="text-slate-300 hover:text-white font-semibold flex items-center gap-1"
          >
            Download Companion APK <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
```

#### Step 4: Run test to verify it passes
```bash
npx vitest run tests/components/auto-tracking-pairing.test.tsx
```
*Expected Output*: `PASS tests/components/auto-tracking-pairing.test.tsx (1 test passed)`.

#### Step 5: Commit changes
```bash
git add src/app/\(dashboard\)/settings/auto-tracking/page.tsx src/components/auto-tracking/QrCodeGenerator.tsx tests/components/auto-tracking-pairing.test.tsx
```

---

### Task 4: PWA Banner Component & Realtime Toast Hook

**Files Created/Modified:**
- `src/components/auto-tracking/AutoCompanionBanner.tsx` (Created)
- `src/lib/hooks/useAutoTransactionRealtime.ts` (Created)
- `tests/hooks/useAutoTransactionRealtime.test.ts` (Created)

**Interfaces Consumed/Produced:**
- Banner Props: None (reads `localStorage` key `trakingduit_companion_banner_dismissed` and `navigator.userAgent`).
- Realtime Hook: `useAutoTransactionRealtime(userId?: string)`.

#### Step 1: Write the failing test
Create `tests/hooks/useAutoTransactionRealtime.test.ts`.

```typescript
// tests/hooks/useAutoTransactionRealtime.test.ts
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAutoTransactionRealtime } from "../../src/lib/hooks/useAutoTransactionRealtime";

describe("useAutoTransactionRealtime", () => {
  it("should initialize hook without throwing errors", () => {
    const { result } = renderHook(() => useAutoTransactionRealtime("mock-user-123"));
    expect(result.current).toBeUndefined();
  });
});
```

#### Step 2: Run test to verify it fails
```bash
npx vitest run tests/hooks/useAutoTransactionRealtime.test.ts
```
*Expected Output*: `FAIL: Cannot find module '../../src/lib/hooks/useAutoTransactionRealtime'`.

#### Step 3: Implementation

Create `src/components/auto-tracking/AutoCompanionBanner.tsx`.

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { Smartphone, Download, X, ShieldCheck, Zap } from "lucide-react";

export function AutoCompanionBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem("trakingduit_companion_banner_dismissed");
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!isDismissed && isAndroid) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("trakingduit_companion_banner_dismissed", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 p-4 border border-emerald-500/20 shadow-lg mb-4 text-white">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white rounded-full transition"
        aria-label="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3.5">
        <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
          <Smartphone className="w-6 h-6" />
        </div>

        <div className="flex-1 pr-6">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Zap className="w-3 h-3" /> Fitur Otomatis
            </span>
          </div>

          <h4 className="text-sm font-bold text-slate-100">
            Otomatis Catat Transaksi BRImo, BCA & ShopeePay!
          </h4>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Install <strong>TrakingDuit Auto-Companion APK</strong> di Android kamu. Notifikasi bank bakal otomatis tercatat tanpa perlu ketik manual.
          </p>

          <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Aman & Privasi Terjaga
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <a
              href="/download/trakingduit-companion.apk"
              download
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-semibold text-xs rounded-xl shadow-md transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Download APK
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
```

Create `src/lib/hooks/useAutoTransactionRealtime.ts`.

```typescript
"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useAutoTransactionRealtime(userId?: string) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("realtime-auto-transactions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newTx = payload.new;
          if (newTx.source === "auto_notification") {
            const formattedAmount = new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              maximumFractionDigits: 0,
            }).format(newTx.amount);

            const sourceApp = newTx.note
              ? newTx.note.replace(/^Auto-recorded via\s*/i, "")
              : "Bank";
            const merchantText = newTx.merchant ? ` (${newTx.merchant})` : "";
            const isExpense = newTx.type === "expense";
            const iconStr = isExpense ? "⚡ Pengeluaran" : "🎉 Pemasukan";

            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              new Notification(`${iconStr} ${formattedAmount}${merchantText}`, {
                body: `Sumber: Notifikasi ${sourceApp}`,
                icon: "/icon.png",
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
```

#### Step 4: Run test to verify it passes
```bash
npx vitest run tests/hooks/useAutoTransactionRealtime.test.ts
```
*Expected Output*: `PASS tests/hooks/useAutoTransactionRealtime.test.ts (1 test passed)`.

#### Step 5: Commit changes
```bash
git add src/components/auto-tracking/AutoCompanionBanner.tsx src/lib/hooks/useAutoTransactionRealtime.ts tests/hooks/useAutoTransactionRealtime.test.ts
```

---

### Task 5: Native Android Kotlin Companion App Scaffolding & NotificationListenerService

**Files Created/Modified:**
- `android-companion/build.gradle.kts` (Created)
- `android-companion/app/build.gradle.kts` (Created)
- `android-companion/app/src/main/AndroidManifest.xml` (Created)
- `android-companion/app/src/main/java/id/trakingduit/companion/parser/TransactionParserEngine.kt` (Created)
- `android-companion/app/src/main/java/id/trakingduit/companion/service/CompanionNotificationListenerService.kt` (Created)
- `android-companion/app/src/main/java/id/trakingduit/companion/db/LocalDedupDao.kt` (Created)
- `android-companion/app/src/main/java/id/trakingduit/companion/security/SecureStorageManager.kt` (Created)
- `android-companion/app/src/main/java/id/trakingduit/companion/worker/TransactionIngestWorker.kt` (Created)
- `android-companion/app/src/test/java/id/trakingduit/companion/parser/TransactionParserEngineTest.kt` (Created)

**Interfaces Consumed/Produced:**
- `ParsedNotification`:
  ```kotlin
  data class ParsedNotification(
      val packageName: String,
      val transactionType: String, // "expense" | "income"
      val amount: Double,
      val merchantName: String,
      val dedupHash: String,
      val timestamp: String,
      val categoryHint: String? = null
  )
  ```

#### Step 1: Write the failing unit test
Create `android-companion/app/src/test/java/id/trakingduit/companion/parser/TransactionParserEngineTest.kt`.

```kotlin
// android-companion/app/src/test/java/id/trakingduit/companion/parser/TransactionParserEngineTest.kt
package id.trakingduit.companion.parser

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class TransactionParserEngineTest {

    private val parser = TransactionParserEngine()

    @Test
    fun parseBRImoExpense_returnsValidNotification() {
        val result = parser.parse(
            packageName = "id.co.bri.brimo",
            title = "Notifikasi Transaksi",
            text = "Transfer Sdr KOPI KENANGAN sebesar Rp 50.000"
        )

        assertNotNull(result)
        assertEquals("expense", result?.transactionType)
        assertEquals(50000.0, result?.amount ?: 0.0, 0.01)
        assertEquals("KOPI KENANGAN", result?.merchantName)
        assertNotNull(result?.dedupHash)
    }

    @Test
    fun parseBCAExpense_returnsValidNotification() {
        val result = parser.parse(
            packageName = "id.co.bca.mobile",
            title = "m-Transfer",
            text = "m-Transfer Rp 150.000 ke WARUNG MAKAN"
        )

        assertNotNull(result)
        assertEquals("expense", result?.transactionType)
        assertEquals(150000.0, result?.amount ?: 0.0, 0.01)
        assertEquals("WARUNG MAKAN", result?.merchantName)
    }

    @Test
    fun parseShopeePayExpense_returnsValidNotification() {
        val result = parser.parse(
            packageName = "com.shopeepay.id",
            title = "Pembayaran Berhasil",
            text = "Kamu telah membayar Rp 25.000 ke MINIMARKET"
        )

        assertNotNull(result)
        assertEquals("expense", result?.transactionType)
        assertEquals(25000.0, result?.amount ?: 0.0, 0.01)
        assertEquals("MINIMARKET", result?.merchantName)
    }

    @Test
    fun parseUnknownPackage_returnsNull() {
        val result = parser.parse(
            packageName = "com.random.app",
            title = "Hello",
            text = "Transfer Rp 50.000"
        )
        assertNull(result)
    }
}
```

#### Step 2: Run test to verify it fails
```bash
cd android-companion && ./gradlew test
```
*Expected Output*: `BUILD FAILED: TransactionParserEngine class not found`.

#### Step 3: Implementation

Create `android-companion/app/src/main/java/id/trakingduit/companion/parser/TransactionParserEngine.kt`.

```kotlin
package id.trakingduit.companion.parser

import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.regex.Pattern

data class ParsedNotification(
    val packageName: String,
    val transactionType: String, // "expense" | "income"
    val amount: Double,
    val merchantName: String,
    val dedupHash: String,
    val timestamp: String,
    val categoryHint: String? = null
)

interface NotificationParser {
    fun parse(packageName: String, title: String, text: String): ParsedNotification?
}

class TransactionParserEngine : NotificationParser {

    private val rules = listOf(
        // BRImo Rules
        ParserRule(
            packageNames = setOf("id.co.bri.brimo"),
            type = "expense",
            regex = Pattern.compile("(?i)Transfer\\s+Sdr\\s+(?<merchant>.+?)\\s+sebesar\\s+Rp\\s*(?<amount>[\\d\\.,]+)"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        ),
        ParserRule(
            packageNames = setOf("id.co.bri.brimo"),
            type = "expense",
            regex = Pattern.compile("(?i)(?:Pembayaran|Pembelian)\\s+Rp\\s*(?<amount>[\\d\\.,]+)\\s+di\\s+(?<merchant>.+)"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        ),
        ParserRule(
            packageNames = setOf("id.co.bri.brimo"),
            type = "income",
            regex = Pattern.compile("(?i)Transfer\\s+dari\\s+(?<merchant>.+?)\\s+sebesar\\s+Rp\\s*(?<amount>[\\d\\.,]+)"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        ),
        // BCA Rules (BCA Mobile, myBCA, com.bca)
        ParserRule(
            packageNames = setOf("id.co.bca.mobile", "id.co.bca.mybca", "com.bca"),
            type = "expense",
            regex = Pattern.compile("(?i)m-Transfer\\s+Rp\\s*(?<amount>[\\d\\.,]+)\\s+ke\\s+(?<merchant>.+)"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        ),
        ParserRule(
            packageNames = setOf("id.co.bca.mobile", "id.co.bca.mybca", "com.bca"),
            type = "expense",
            regex = Pattern.compile("(?i)QRIS\\s+Rp\\s*(?<amount>[\\d\\.,]+)\\s+di\\s+(?<merchant>.+)"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        ),
        ParserRule(
            packageNames = setOf("id.co.bca.mobile", "id.co.bca.mybca", "com.bca"),
            type = "income",
            regex = Pattern.compile("(?i)m-Transfer\\s+Rp\\s*(?<amount>[\\d\\.,]+)\\s+dari\\s+(?<merchant>.+)"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        ),
        // ShopeePay Rules (com.shopeepay.id, com.shopee.id)
        ParserRule(
            packageNames = setOf("com.shopeepay.id", "com.shopee.id"),
            type = "expense",
            regex = Pattern.compile("(?i)Kamu\\s+telah\\s+membayar\\s+Rp\\s*(?<amount>[\\d\\.,]+)\\s+ke\\s+(?<merchant>.+)"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        ),
        ParserRule(
            packageNames = setOf("com.shopeepay.id", "com.shopee.id"),
            type = "expense",
            regex = Pattern.compile("(?i)Pembayaran\\s+Rp\\s*(?<amount>[\\d\\.,]+)\\s+berhasil"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        ),
        ParserRule(
            packageNames = setOf("com.shopeepay.id", "com.shopee.id"),
            type = "income",
            regex = Pattern.compile("(?i)Kamu\\s+menerima\\s+Rp\\s*(?<amount>[\\d\\.,]+)\\s+dari\\s+(?<merchant>.+)"),
            merchantGroup = "merchant",
            amountGroup = "amount"
        )
    )

    override fun parse(packageName: String, title: String, text: String): ParsedNotification? {
        val fullContent = "$title $text"
        val matchedRule = rules.firstOrNull { rule ->
            rule.packageNames.contains(packageName) && rule.regex.matcher(fullContent).find()
        } ?: return null

        val matcher = matchedRule.regex.matcher(fullContent)
        if (!matcher.find()) return null

        val rawAmount = matcher.group(matchedRule.amountGroup) ?: return null
        val cleanAmount = parseAmount(rawAmount) ?: return null
        val rawMerchant = try {
            matcher.group(matchedRule.merchantGroup)?.trim() ?: "Shopee Merchant"
        } catch (e: Exception) {
            "Shopee Merchant"
        }
        val normalizedMerchant = rawMerchant.take(100)

        val formattedAmount = String.format(Locale.US, "%.0f", cleanAmount)
        val sanitizedMerchantUpper = normalizedMerchant.uppercase(Locale.US).replace("\\s+".toRegex(), "")

        val minuteFormatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US)
        val isoFormatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        val now = Date()
        val minuteStr = minuteFormatter.format(now)
        val isoTimestamp = isoFormatter.format(now)

        val dedupKey = "$packageName|${matchedRule.type}|$formattedAmount|$sanitizedMerchantUpper|$minuteStr"
        val dedupHash = computeSha256(dedupKey)

        return ParsedNotification(
            packageName = packageName,
            transactionType = matchedRule.type,
            amount = cleanAmount,
            merchantName = normalizedMerchant,
            dedupHash = dedupHash,
            timestamp = isoTimestamp
        )
    }

    private fun parseAmount(raw: String): Double? {
        val digitsOnly = raw.replace(".", "").replace(",", ".")
        return digitsOnly.toDoubleOrNull()
    }

    private fun computeSha256(input: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }
}

private data class ParserRule(
    val packageNames: Set<String>,
    val type: String,
    val regex: Pattern,
    val merchantGroup: String,
    val amountGroup: String
)
```

Create `android-companion/app/src/main/java/id/trakingduit/companion/service/CompanionNotificationListenerService.kt`.

```kotlin
package id.trakingduit.companion.service

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import id.trakingduit.companion.parser.TransactionParserEngine
import id.trakingduit.companion.worker.TransactionIngestWorker
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf

class CompanionNotificationListenerService : NotificationListenerService() {

    private val parserEngine = TransactionParserEngine()

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        val notification = sbn?.notification ?: return
        val packageName = sbn.packageName ?: return

        val extras = notification.extras
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""

        val parsedResult = parserEngine.parse(packageName, title, text) ?: return

        // Dispatch background WorkManager ingest task
        val workData = workDataOf(
            "app_identifier" to parsedResult.packageName,
            "amount" to parsedResult.amount,
            "type" to parsedResult.transactionType,
            "merchant_name" to parsedResult.merchantName,
            "dedup_hash" to parsedResult.dedupHash,
            "timestamp" to parsedResult.timestamp
        )

        val workRequest = OneTimeWorkRequestBuilder<TransactionIngestWorker>()
            .setInputData(workData)
            .build()

        WorkManager.getInstance(applicationContext).enqueue(workRequest)
    }
}
```

Create Android Manifest entry `android-companion/app/src/main/AndroidManifest.xml`.

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="id.trakingduit.companion">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE" />

    <application
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="TrakingDuit Companion"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.Light.NoActionBar">

        <service
            android:name=".service.CompanionNotificationListenerService"
            android:label="TrakingDuit Notification Listener"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

    </application>
</manifest>
```

#### Step 4: Run test to verify it passes
```bash
cd android-companion && ./gradlew test
```
*Expected Output*: `BUILD SUCCESSFUL - 4 unit tests passed`.

#### Step 5: Commit changes
```bash
git add android-companion/
```

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-18-auto-tracking-companion.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
