# TrackingDuit Auto-Tracking Companion Feature Specification

**Document Version:** 1.0.0  
**Date:** 2026-08-18  
**Status:** Approved  
**Target Path:** `docs/superpowers/specs/2026-08-18-auto-tracking-companion-design.md`

---

## 1. Executive Summary & Architecture

### 1.1 Overview
The **TrackingDuit Auto-Tracking Companion** is an automated financial data ingestion system designed to capture bank and e-wallet transaction notifications on Android devices in real-time. By parsing push notifications locally on the user's smartphone and sending structured payloads directly to the TrackingDuit Next.js backend, financial transactions are saved instantly to Supabase with zero manual input required.

### 1.2 System Components
1. **Android Companion App (`TrakingDuitCompanion`)**:
   - Lightweight standalone Native Kotlin application.
   - Leverages Android `NotificationListenerService` to capture status bar notifications from authorized banking and e-wallet applications (BRImo: `id.co.bri.brimo`, BCA: `id.co.bca.mobile`, `id.co.bca.mybca`, `com.bca`, ShopeePay: `com.shopeepay.id`, `com.shopee.id`).
   - Extracts relevant parameters (Amount, Transaction Type, Merchant/Sender, Date) via local regular expression matching.
   - Computes local SHA-256 deduplication hashes and dispatches payload directly to backend API via HTTPS.
2. **Next.js Backend Endpoint (`POST /api/auto-transactions/ingest`)**:
   - Secure serverless route handling authentication, payload validation, database deduplication checks, wallet matching, auto-categorization, and direct transaction persistence.
3. **Supabase Database Layer**:
   - Stores transactions with extended source `auto_notification`.
   - Maintains `auto_app_identifier` mapping on wallets.
   - Stores audit/diagnostic records in `auto_transaction_logs`.
4. **TrackingDuit PWA Frontend**:
   - Promotes APK installation via a dismissible Dashboard banner.
   - Displays real-time toast notifications via Supabase Realtime when auto-saved transactions arrive.

### 1.3 High-Level Component Diagram
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Android Device                                                                  │
│                                                                                 │
│  ┌───────────────────────┐       ┌───────────────────────────────────────────┐  │
│  │ Banking Apps           │       │ TrakingDuit Companion App (Kotlin)        │  │
│  │ (BRImo, BCA, Shopee)  │       │                                           │  │
│  └───────────┬───────────┘       │  ┌─────────────────────────────────────┐  │  │
│              │ Push Notification │  │ NotificationListenerService         │  │  │
│              └──────────────────►│  └──────────────────┬──────────────────┘  │  │
│                                  │                     │ Raw Notification    │  │
│                                  │  ┌──────────────────▼──────────────────┐  │  │
│                                  │  │ Local Regex Parsers                 │  │  │
│                                  │  │ (BRImo / BCA / ShopeePay)           │  │  │
│                                  │  └──────────────────┬──────────────────┘  │  │
│                                  │                     │ Structured Data     │  │
│                                  │  ┌──────────────────▼──────────────────┐  │  │
│                                  │  │ SHA-256 Local Dedup & HTTP Client   │  │  │
│                                  │  └──────────────────┬──────────────────┘  │  │
└──────────────────────────────────┴─────────────────────┼─────────────────────┴──┘
                                                         │ HTTPS POST (Bearer JWT)
                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ TrackingDuit Web Application (Next.js & Supabase)                              │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │ POST /api/auto-transactions/ingest                                        │  │
│  │                                                                           │  │
│  │  1. Authenticate Bearer Token (Supabase JWT / User Session)                │  │
│  │  2. Verify Dedup Hash (db check in transactions & auto_transaction_logs)  │  │
│  │  3. Resolve Wallet (auto_app_identifier match)                             │  │
│  │  4. Auto-Assign Category (Keyword Matching)                               │  │
│  │  5. Insert row into `transactions` table                                   │  │
│  │  6. Audit entry into `auto_transaction_logs`                              │  │
│  └──────────────────────────────────┬────────────────────────────────────────┘  │
│                                     │ DB Insert Event                           │
│                                     ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │ Supabase Realtime Subscription                                            │  │
│  └──────────────────────────────────┬────────────────────────────────────────┘  │
│                                     │ WebSocket Broadcast                       │
│                                     ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │ TrackingDuit PWA Web Client                                               │  │
│  │ -> Displays Toast: "⚡ Pengeluaran Rp 50.000 (Kopi Kenangan) tersimpan!"   │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow & Security

### 2.1 Privacy & Raw Text Exclusion
- **No Raw Text Storage**: Notification body text contains sensitive details (e.g., account numbers, remaining balances, OTPs, personal notes). Raw notification string text is **never** uploaded to the backend or stored in Supabase.
- **Local Parsing**: Extraction of amount, transaction direction (income/expense), and merchant/sender occurs **strictly on-device** inside the Kotlin Companion application memory.
- **Immediate Garbage Collection**: Upon regex parsing, raw strings are discarded from mobile RAM.

### 2.2 Local SHA-256 Deduplication
To prevent duplicate records caused by notification retries, system re-broadcasts, or app restarts:
1. **Hash Composition**:
   ```
   raw_key = package_name + "|" + transaction_type + "|" + formatted_amount + "|" + sanitized_merchant_upper + "|" + minute_timestamp
   ```
   *Determinism Rules*:
   - `formatted_amount`: Amount formatted as an integer or rounded string without trailing decimals (e.g., `50000` instead of `50000.0` or `50000.00`).
   - `sanitized_merchant_upper`: Merchant string trimmed, converted to uppercase, with non-alphanumeric whitespace stripped (e.g., `KOPIKENANGAN`).
   *Example*: `id.co.bri.brimo|expense|50000|KOPIKENANGAN|2026-08-18T10:15`
2. **Hash Computation**: Standard SHA-256 digest yielding a 64-character hexadecimal string (`dedup_hash`).
3. **Local Cache**: Android app maintains an in-memory & SQLite cache (Room database) of recently dispatched `dedup_hash` strings (TTL: 24 hours). If a matching notification arrives, it is dropped immediately before network calls are fired.

### 2.3 HTTPS & Authentication Architecture
- **Transport Security**: All HTTP communication between Companion App and Next.js Backend requires TLS (HTTPS).
- **Authorization Header**: Requests carry standard HTTP Authorization header with Supabase Auth Bearer JWT:
  ```http
  Authorization: Bearer <SUPABASE_USER_JWT>
  Content-Type: application/json
  ```
- **Session Management**: Companion App authenticates via APK Auth Pairing (QR Code scanner or manual auth token code in PWA Settings), storing the access JWT and refresh token in Android `EncryptedSharedPreferences` (see Section 4.4).

---

## 3. Database Migration Script

The following PostgreSQL migration script extends existing schema definitions (`tx_source` enum, `wallets` table) and establishes the audit table `auto_transaction_logs` with proper Row-Level Security (RLS) policies and indexes.

```sql
-- Migration File: supabase/migrations/20260818000000_add_auto_tracking_companion.sql

-- 1. Extend TxSource enum or type constraint to include 'auto_notification'
DO $$ 
BEGIN
    -- Check if tx_source enum exists as a PostgreSQL type
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

---

## 4. Kotlin Parser Rules

The Android Companion application implements parser specifications per financial app package.

### 4.1 Target Package Identifiers
- **BRImo**: `id.co.bri.brimo`
- **BCA (Mobile / myBCA / Digital)**: `id.co.bca.mobile`, `id.co.bca.mybca`, `com.bca`
- **ShopeePay / Shopee**: `com.shopeepay.id`, `com.shopee.id`

### 4.2 Regex Rules Table

| Bank / App | Package Names | Direction | Pattern Regex | Extract Groups |
| :--- | :--- | :--- | :--- | :--- |
| **BRImo** | `id.co.bri.brimo` | Expense | `(?i)Transfer\s+Sdr\s+(?<merchant>.+?)\s+sebesar\s+Rp\s*(?<amount>[\d\.\,]+)` | `${merchant}`, `${amount}` |
| **BRImo** | `id.co.bri.brimo` | Expense | `(?i)(?:Pembayaran\|Pembelian)\s+Rp\s*(?<amount>[\d\.\,]+)\s+di\s+(?<merchant>.+)` | `${amount}`, `${merchant}` |
| **BRImo** | `id.co.bri.brimo` | Income | `(?i)Transfer\s+dari\s+(?<merchant>.+?)\s+sebesar\s+Rp\s*(?<amount>[\d\.\,]+)` | `${merchant}`, `${amount}` |
| **BCA** | `id.co.bca.mobile`, `id.co.bca.mybca`, `com.bca` | Expense | `(?i)m-Transfer\s+Rp\s*(?<amount>[\d\.\,]+)\s+ke\s+(?<merchant>.+)` | `${amount}`, `${merchant}` |
| **BCA** | `id.co.bca.mobile`, `id.co.bca.mybca`, `com.bca` | Expense | `(?i)QRIS\s+Rp\s*(?<amount>[\d\.\,]+)\s+di\s+(?<merchant>.+)` | `${amount}`, `${merchant}` |
| **BCA** | `id.co.bca.mobile`, `id.co.bca.mybca`, `com.bca` | Income | `(?i)m-Transfer\s+Rp\s*(?<amount>[\d\.\,]+)\s+dari\s+(?<merchant>.+)` | `${amount}`, `${merchant}` |
| **ShopeePay** | `com.shopeepay.id`, `com.shopee.id` | Expense | `(?i)Kamu\s+telah\s+membayar\s+Rp\s*(?<amount>[\d\.\,]+)\s+ke\s+(?<merchant>.+)` | `${amount}`, `${merchant}` |
| **ShopeePay** | `com.shopeepay.id`, `com.shopee.id` | Expense | `(?i)Pembayaran\s+Rp\s*(?<amount>[\d\.\,]+)\s+berhasil` | `${amount}`, default `"Shopee Merchant"` |
| **ShopeePay** | `com.shopeepay.id`, `com.shopee.id` | Income | `(?i)Kamu\s+menerima\s+Rp\s*(?<amount>[\d\.\,]+)\s+dari\s+(?<merchant>.+)` | `${amount}`, `${merchant}` |

### 4.3 Kotlin Parser Implementation Architecture

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
        val rawMerchant = matcher.group(matchedRule.merchantGroup)?.trim() ?: "Merchant"
        val normalizedMerchant = rawMerchant.take(100)

        // Deterministic hashing parameters:
        // 1. Amount formatted as integer string without decimal places (e.g., 50000)
        val formattedAmount = String.format(Locale.US, "%.0f", cleanAmount)
        // 2. Merchant name stripped of non-alphanumeric whitespace and converted to uppercase (e.g., KOPIKENANGAN)
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

### 4.4 APK Auth Pairing Flow (Companion App Authentication)

To authorize the Android Companion App to post notification transactions into the user's TrackingDuit account, a secure token pairing flow is established between the PWA and the Companion App.

#### Pairing Architecture & Data Flow

1. **PWA Pairing UI (`Settings > Auto-Tracking`)**:
   - The user navigates to PWA Settings and clicks **"Pair Companion App"**.
   - The PWA fetches the active Supabase Auth session (`access_token` and `refresh_token`).
   - A QR Code is generated on screen (alongside a manual pairing code copy field) containing the JSON payload:
     ```json
     {
       "api_url": "https://trakingduit.vercel.app/api/auto-transactions/ingest",
       "supabase_url": "https://<project-ref>.supabase.co",
       "access_token": "eyJhbGciOi...",
       "refresh_token": "rF8xK..."
     }
     ```

2. **Android Companion App Scanning & Secure Storage**:
   - The Companion App features an **"Auth Pairing"** screen equipped with an embedded QR scanner (CameraX + ML Kit Barcode Scanning) and a manual token input field.
   - Upon scanning, the app parses the payload, validates token format, and tests endpoint reachability (`POST /api/auto-transactions/ingest`).
   - Credentials (`access_token`, `refresh_token`, `api_url`, `supabase_url`) are saved securely on device using Android's `EncryptedSharedPreferences` (or Jetpack DataStore with MasterKey hardware backing).

3. **Automatic Refresh Token Lifecycle**:
   - Before firing an ingestion HTTP POST request, the Companion App checks if the current `access_token` is expired or nearing expiration (< 5 minutes remaining).
   - If expired, the app performs a background token refresh directly against Supabase Auth:
     `POST ${supabase_url}/auth/v1/token?grant_type=refresh_token`
     with `{"refresh_token": saved_refresh_token}`.
   - The newly returned `access_token` and `refresh_token` are saved back to `EncryptedSharedPreferences` transparently without disrupting background notification processing.
```

---

## 5. Backend API Route Spec

### 5.1 Endpoint Details
- **Route**: `POST /api/auto-transactions/ingest`
- **Authentication**: `Authorization: Bearer <SUPABASE_JWT>`
- **Content-Type**: `application/json`

### 5.2 Request Payload Schema
```json
{
  "app_identifier": "id.co.bri.brimo",
  "amount": 50000.00,
  "type": "expense",
  "merchant_name": "Kopi Kenangan",
  "dedup_hash": "a8f5f167f44f4964e6c998dee827110c",
  "timestamp": "2026-08-18T10:15:30.000Z",
  "category_hint": "Makanan & Minuman"
}
```

### 5.3 Response Schemas

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "status": "created",
  "transaction_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "wallet_id": "c39a3f2b-7b1e-4c3d-9e12-8f9a0b1c2d3e",
  "message": "Transaction auto-recorded successfully"
}
```

#### Duplicate Ignored Response (`200 OK`)
```json
{
  "success": true,
  "status": "duplicate_ignored",
  "message": "Transaction notification hash already processed"
}
```

#### Error Response (`400 / 401 / 500`)
```json
{
  "success": false,
  "status": "error",
  "error": "Unauthorized / Invalid payload / Internal server error"
}
```

### 5.4 Backend Implementation Code (`src/app/api/auto-transactions/ingest/route.ts`)

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

    const token = authHeader.substring(7);

    // Instantiate Supabase client with user's JWT
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

    if (!payload.app_identifier || !payload.amount || !payload.type || !payload.dedup_hash) {
      return NextResponse.json(
        { success: false, status: "error", error: "Missing required payload fields" },
        { status: 400 }
      );
    }

    // 1. Check for duplicate hash in auto_transaction_logs
    const { data: existingLogs } = await supabase
      .from("auto_transaction_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("dedup_hash", payload.dedup_hash)
      .limit(1);

    if (existingLogs && existingLogs.length > 0) {
      // Log duplicate attempt into audit logs
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
        { success: true, status: "duplicate_ignored", message: "Transaction notification hash already processed" },
        { status: 200 }
      );
    }

    // 2. Resolve matching wallet by auto_app_identifier
    let walletId: string | null = null;
    const { data: matchingWallets } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", user.id)
      .eq("auto_app_identifier", payload.app_identifier)
      .eq("deleted", 0)
      .limit(1);

    if (matchingWallets && matchingWallets.length > 0) {
      walletId = matchingWallets[0].id;
    } else {
      // Fallback: Get user's default/first active wallet
      const { data: defaultWallets } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .eq("deleted", 0)
        .order("order", { ascending: true })
        .limit(1);

      if (defaultWallets && defaultWallets.length > 0) {
        walletId = defaultWallets[0].id;
      }
    }

    if (!walletId) {
      // Log failure in auto_transaction_logs
      await supabase.from("auto_transaction_logs").insert({
        user_id: user.id,
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

    // 3. Resolve category ID based on keywords/merchant name
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

    // 4. Direct auto-save to transactions table
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

    // 5. Record successful ingestion audit log
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

---

## 6. PWA UX/UI Banner & Toast Specifications

### 6.1 PWA Dashboard Installation Banner

#### Visual Design & Component Behavior
- **Positioning**: Displayed at the top of the PWA Dashboard directly below the header/total balance summary card.
- **Dismissible State**: Includes an "X" close icon; dismissing persists state in `localStorage` (`trakingduit_hide_companion_banner = true`) for 14 days.
- **Visual Styling**: Dark emerald/indigo gradient background with glowing subtle border, mobile phone icon with notification badge, clear title, concise subtitle, and direct APK download button.

#### Banner Component Code (`src/components/dashboard/AutoCompanionBanner.tsx`)

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

---

### 6.2 Real-time Toast Notifications

#### Supabase Realtime Listener Integration
The PWA subscribes to WebSocket `INSERT` events on the `transactions` table filtered by `source = 'auto_notification'`. Upon event arrival, a dynamic toast notification alerts the user instantly.

#### Listener Hook Code (`src/hooks/useAutoTransactionRealtime.ts`)

```typescript
"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner"; // Or app's custom toast system

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

            toast.success(`${iconStr} ${formattedAmount}${merchantText} Otomatis Tersimpan!`, {
              description: `Sumber: Notifikasi ${sourceApp}`,
              duration: 5000,
            });
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

---

## 7. Summary Checklist & Next Steps

- [x] **Architecture Spec**: Native Kotlin `NotificationListenerService` + Next.js Serverless Ingest.
- [x] **Privacy & Deduplication**: No raw text retention; on-device parsing + SHA-256 local & remote hash validation with deterministic integer amount formatting and uppercase sanitized merchant names.
- [x] **Database Migration**: Schema extensions for `tx_source` enum, `wallets.auto_app_identifier`, and `auto_transaction_logs` audit table (`status IN ('success', 'duplicate_ignored', 'wallet_not_found', 'error')`).
- [x] **Kotlin Regex Rules & Package Harmonization**: Full regex engines and harmonized package rules for BRImo (`id.co.bri.brimo`), BCA (`id.co.bca.mobile`, `id.co.bca.mybca`, `com.bca`), and ShopeePay (`com.shopeepay.id`, `com.shopee.id`).
- [x] **APK Auth Pairing Flow**: QR Code scanner + manual auth token code pairing in PWA Settings with automatic refresh token lifecycle.
- [x] **Backend Spec**: `POST /api/auto-transactions/ingest` with user auth, wallet matching, auto-categorization, duplicate check logging (`duplicate_ignored`), transaction creation, and audit logging.
- [x] **PWA UX**: Install banner component + Supabase Realtime toast listener integration with harmonized notification toast description.
