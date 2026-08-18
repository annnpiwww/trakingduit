import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

interface AutoIngestPayload {
  source_app?: string;
  app_identifier?: string;
  amount: number;
  type: "expense" | "income";
  merchant?: string;
  merchant_name?: string;
  transaction_timestamp?: string;
  timestamp?: string;
  notification_hash?: string;
  dedup_hash?: string;
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

    const supabase = supabaseFromRequest(req) ?? supabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { success: false, status: "error", error: "Supabase client not initialized" },
        { status: 500 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, status: "error", error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const body: AutoIngestPayload = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, status: "error", error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const sourceApp = (body.source_app || body.app_identifier || "").trim();
    const amount = Number(body.amount);
    const type = body.type;
    const merchant = (body.merchant ?? body.merchant_name ?? "").trim();
    const transactionTimestamp = (body.transaction_timestamp || body.timestamp || "").trim();
    const notificationHash = (body.notification_hash || body.dedup_hash || "").trim();
    const categoryHint = body.category_hint ? String(body.category_hint).trim() : undefined;

    if (
      !sourceApp ||
      isNaN(amount) ||
      amount <= 0 ||
      (type !== "expense" && type !== "income") ||
      !transactionTimestamp ||
      !notificationHash
    ) {
      return NextResponse.json(
        { success: false, status: "error", error: "Missing required payload fields" },
        { status: 400 }
      );
    }

    // 1. Deduplication check against auto_transaction_logs
    const { data: existingLog } = await supabase
      .from("auto_transaction_logs")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("notification_hash", notificationHash)
      .maybeSingle();

    if (existingLog) {
      try {
        await supabase.from("auto_transaction_logs").insert({
          user_id: user.id,
          notification_hash: notificationHash,
          source_app: sourceApp,
          amount,
          merchant: merchant || null,
          status: "duplicate_ignored",
          error_message: "Duplicate transaction hash detected",
        });
      } catch {
        // Ignore duplicate log insert error
      }

      return NextResponse.json(
        {
          success: true,
          status: "duplicate_ignored",
          message: "Duplicate transaction hash detected",
        },
        { status: 200 }
      );
    }

    // 2. Wallet resolution: Look up wallet matching auto_app_identifier, or fallback to user's first wallet
    let walletId: string | null = null;
    const { data: appWallet } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", user.id)
      .eq("auto_app_identifier", sourceApp)
      .eq("deleted", 0)
      .limit(1)
      .maybeSingle();

    if (appWallet) {
      walletId = appWallet.id;
    } else {
      const { data: fallbackWallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .eq("deleted", 0)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fallbackWallet) {
        walletId = fallbackWallet.id;
      }
    }

    if (!walletId) {
      await supabase.from("auto_transaction_logs").insert({
        user_id: user.id,
        notification_hash: notificationHash,
        source_app: sourceApp,
        amount,
        merchant: merchant || null,
        status: "wallet_not_found",
        error_message: "No active wallet found for user",
      });

      return NextResponse.json(
        { success: false, status: "error", error: "No active wallet found for user" },
        { status: 400 }
      );
    }

    // 3. Category resolution: Keyword lookup on merchant/categoryHint against user's categories
    let categoryId: string | null = null;
    const searchText = `${merchant} ${categoryHint ?? ""}`.trim().toLowerCase();

    if (searchText) {
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name, keywords")
        .eq("user_id", user.id)
        .eq("deleted", 0);

      if (categories && categories.length > 0) {
        for (const cat of categories) {
          if (cat.name && searchText.includes(cat.name.toLowerCase())) {
            categoryId = cat.id;
            break;
          }
          if (Array.isArray(cat.keywords)) {
            if (cat.keywords.some((kw: string) => searchText.includes(kw.toLowerCase()))) {
              categoryId = cat.id;
              break;
            }
          }
        }
      }

      if (!categoryId) {
        const defaultCategoryKeywords: Record<string, string[]> = {
          "Makanan & Minuman": ["warung", "makan", "food", "kopi", "cafe", "restoran", "bakso", "indomaret", "alfamart"],
          Transportasi: ["gojek", "grab", "maxim", "bensin", "pertamina", "shell", "parkir", "toll"],
          Belanja: ["shopee", "tokopedia", "lazada", "blibli", "supermarket", "minimarket"],
          Tagihan: ["pln", "pdam", "pulsa", "kuota", "telkom", "indihome"],
        };

        for (const [catName, kws] of Object.entries(defaultCategoryKeywords)) {
          if (kws.some((kw) => searchText.includes(kw))) {
            const { data: matchedCat } = await supabase
              .from("categories")
              .select("id")
              .eq("user_id", user.id)
              .ilike("name", `%${catName}%`)
              .limit(1)
              .maybeSingle();

            if (matchedCat) {
              categoryId = matchedCat.id;
              break;
            }
          }
        }
      }
    }

    // 4. Create transaction record in transactions table
    const dateStr = transactionTimestamp.includes("T")
      ? transactionTimestamp.split("T")[0]
      : transactionTimestamp.substring(0, 10);

    const txId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newTx = {
      id: txId,
      user_id: user.id,
      type,
      amount,
      wallet_id: walletId,
      category_id: categoryId,
      date: dateStr,
      note: `Auto-recorded from ${sourceApp}${merchant ? ` (${merchant})` : ""}`,
      merchant: merchant || null,
      source: "auto_notification",
      tags: ["auto-tracking"],
      created_at: now,
      updated_at: now,
      deleted: 0,
    };

    const { data: insertedTx, error: txError } = await supabase
      .from("transactions")
      .insert(newTx)
      .select("id")
      .single();

    if (txError) {
      await supabase.from("auto_transaction_logs").insert({
        user_id: user.id,
        notification_hash: notificationHash,
        source_app: sourceApp,
        amount,
        merchant: merchant || null,
        status: "error",
        error_message: txError.message,
      });

      return NextResponse.json(
        { success: false, status: "error", error: "Database insertion failed: " + txError.message },
        { status: 500 }
      );
    }

    const createdTxId = insertedTx?.id || txId;

    // 5. Insert success audit log
    await supabase.from("auto_transaction_logs").insert({
      user_id: user.id,
      notification_hash: notificationHash,
      source_app: sourceApp,
      amount,
      merchant: merchant || null,
      status: "success",
    });

    return NextResponse.json(
      {
        success: true,
        transaction_id: createdTxId,
        wallet_id: walletId,
        status: "success",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { success: false, status: "error", error: errorMsg },
      { status: 500 }
    );
  }
}
