import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseFromRequest } from "@/lib/supabase";

export const runtime = "nodejs";

const NEEDS_AUTH = {
  error: "Butuh header Authorization: Bearer <access_token> dari POST /api/auth/login",
} as const;

const TransactionBody = z.object({
  id: z.string().optional(),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().positive("Nominal harus lebih dari 0"),
  wallet_id: z.string(),
  to_wallet_id: z.string().optional(),
  category_id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  note: z.string().optional(),
  merchant: z.string().optional(),
  tags: z.array(z.string()).default([]),
  source: z.enum(["manual", "ocr", "import", "sheet"]).default("manual"),
});

/** GET /transactions?from=&to=&wallet_id=&type=&limit= */
export async function GET(request: Request) {
  const sb = supabaseFromRequest(request);
  if (!sb) return NextResponse.json(NEEDS_AUTH, { status: 401 });

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const walletId = url.searchParams.get("wallet_id");
  const type = url.searchParams.get("type");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 1000);

  let query = sb
    .from("transactions")
    .select("*")
    .eq("deleted", 0)
    .order("date", { ascending: false })
    .limit(limit);

  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  if (walletId) query = query.eq("wallet_id", walletId);
  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ transactions: data ?? [], count: data?.length ?? 0 });
}

/** POST /transactions — create or upsert one transaction. */
export async function POST(request: Request) {
  const sb = supabaseFromRequest(request);
  if (!sb) return NextResponse.json(NEEDS_AUTH, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const parsed = TransactionBody.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
      { status: 400 },
    );
  }

  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });

  if (parsed.data.type === "transfer" && !parsed.data.to_wallet_id) {
    return NextResponse.json(
      { error: "Transfer wajib menyertakan to_wallet_id" },
      { status: 400 },
    );
  }

  // Verify wallet ownership before creating transaction
  const { data: wallet, error: walletError } = await sb
    .from("wallets")
    .select("id")
    .eq("id", parsed.data.wallet_id)
    .eq("user_id", auth.user.id)
    .single();

  if (walletError || !wallet) {
    return NextResponse.json(
      { error: "Wallet tidak ditemukan atau bukan milik kamu" },
      { status: 403 },
    );
  }

  // If transfer, verify to_wallet ownership too
  if (parsed.data.type === "transfer" && parsed.data.to_wallet_id) {
    const { data: toWallet, error: toWalletError } = await sb
      .from("wallets")
      .select("id")
      .eq("id", parsed.data.to_wallet_id)
      .eq("user_id", auth.user.id)
      .single();

    if (toWalletError || !toWallet) {
      return NextResponse.json(
        { error: "Destination wallet tidak ditemukan atau bukan milik kamu" },
        { status: 403 },
      );
    }
  }

  // Verify category ownership if provided
  if (parsed.data.category_id) {
    const { data: category, error: categoryError } = await sb
      .from("categories")
      .select("id")
      .eq("id", parsed.data.category_id)
      .eq("user_id", auth.user.id)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: "Category tidak ditemukan atau bukan milik kamu" },
        { status: 403 },
      );
    }
  }

  const now = new Date().toISOString();
  const row = {
    ...parsed.data,
    id: parsed.data.id ?? crypto.randomUUID(),
    user_id: auth.user.id,
    created_at: now,
    updated_at: now,
    deleted: 0,
  };

  const { data, error } = await sb.from("transactions").upsert(row, { onConflict: "id" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ transaction: data }, { status: 201 });
}
