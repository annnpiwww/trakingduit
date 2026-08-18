"use client";

import { db, getSetting, setSetting } from "../db";
import { txToSheetRow, type SheetRow } from "../export";
import { pushNotification } from "../repo";
import type { Category, ID, SyncLog, Transaction, Wallet } from "../types";
import { newId, nowISO, toDateKey } from "../utils";

export const LAST_SHEET_SYNC = "sync.googleSheet.lastAt";

export interface SyncResult {
  pushed: number;
  pulled: number;
  total: number;
  at: string;
}

async function logSync(entry: Omit<SyncLog, "id">) {
  await db().syncLogs.add(entry as SyncLog);
}

/** Resolve a wallet by name, creating it when the sheet references a new one. */
async function resolveWallet(name: string, wallets: Wallet[]): Promise<ID | undefined> {
  if (!name) return undefined;
  const found = wallets.find((w) => w.name.toLowerCase() === name.toLowerCase());
  if (found) return found.id;
  const row: Wallet = {
    id: newId(),
    name,
    type: "cash",
    initial_balance: 0,
    currency: "IDR",
    color: "#64748b",
    icon: "wallet",
    archived: 0,
    order: wallets.length,
    created_at: nowISO(),
    updated_at: nowISO(),
    deleted: 0,
  };
  await db().wallets.add(row);
  wallets.push(row);
  return row.id;
}

async function resolveCategory(
  name: string,
  type: "income" | "expense",
  categories: Category[],
): Promise<ID | undefined> {
  if (!name) return undefined;
  const found = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (found) return found.id;
  const row: Category = {
    id: newId(),
    name,
    type,
    icon: "ellipsis",
    color: "#94a3b8",
    is_default: 0,
    active: 1,
    keywords: [],
    created_at: nowISO(),
    updated_at: nowISO(),
    deleted: 0,
  };
  await db().categories.add(row);
  categories.push(row);
  return row.id;
}

/** Apply rows coming back from the sheet into the local store. */
async function applyPulled(pulled: SheetRow[]): Promise<number> {
  if (!pulled.length) return 0;
  const d = db();
  const wallets = await d.wallets.toArray();
  const categories = await d.categories.toArray();
  let applied = 0;

  for (const row of pulled) {
    const existing = await d.transactions.get(row.id);
    if (existing && existing.updated_at >= row.updated_at) continue;

    const type = (["income", "expense", "transfer"] as const).includes(
      row.type as Transaction["type"],
    )
      ? (row.type as Transaction["type"])
      : "expense";

    const tx: Transaction = {
      id: row.id,
      type,
      amount: row.amount,
      wallet_id: (await resolveWallet(row.wallet, wallets)) ?? wallets[0]?.id ?? newId(),
      to_wallet_id: row.to_wallet ? await resolveWallet(row.to_wallet, wallets) : undefined,
      category_id:
        type === "transfer"
          ? undefined
          : await resolveCategory(row.category, type === "income" ? "income" : "expense", categories),
      date: row.date || toDateKey(),
      merchant: row.merchant || undefined,
      note: row.note || undefined,
      tags: [],
      source: "sheet",
      created_at: existing?.created_at ?? row.updated_at,
      updated_at: row.updated_at,
      deleted: row.deleted ? 1 : 0,
      remote_rev: row.updated_at,
    };
    await d.transactions.put(tx);
    applied++;
  }
  return applied;
}

/** Two-way sync against the configured Google Spreadsheet. */
export async function syncGoogleSheet(): Promise<SyncResult> {
  const d = db();
  const [transactions, wallets, categories] = await Promise.all([
    d.transactions.toArray(),
    d.wallets.toArray(),
    d.categories.toArray(),
  ]);

  const walletName = (id?: string) => wallets.find((w) => w.id === id)?.name ?? "";
  const catName = (id?: string) => categories.find((c) => c.id === id)?.name ?? "";
  const rows = transactions.map((t) => {
    const [id, date, type, amount, wallet, to_wallet, category, merchant, note, source, updated_at, deleted] =
      txToSheetRow(t, walletName, catName);
    return {
      id: String(id),
      date: String(date),
      type: String(type),
      amount: Number(amount),
      wallet: String(wallet),
      to_wallet: String(to_wallet),
      category: String(category),
      merchant: String(merchant),
      note: String(note),
      source: String(source),
      updated_at: String(updated_at),
      deleted: Number(deleted),
    } satisfies SheetRow;
  });

  const res = await fetch("/api/sync/google-sheet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });

  const json = (await res.json()) as
    | { pushed: number; pulled: SheetRow[]; total: number; at: string }
    | { error: string };

  if (!res.ok || "error" in json) {
    const message = "error" in json ? json.error : "Sinkron gagal";
    await logSync({
      target: "google-sheet",
      direction: "two-way",
      status: "error",
      pushed: 0,
      pulled: 0,
      message,
      at: nowISO(),
    });
    throw new Error(message);
  }

  const applied = await applyPulled(json.pulled);
  await setSetting(LAST_SHEET_SYNC, json.at);
  await logSync({
    target: "google-sheet",
    direction: "two-way",
    status: "success",
    pushed: json.pushed,
    pulled: applied,
    message: `${json.pushed} dikirim, ${applied} diterima, total ${json.total} baris`,
    at: json.at,
  });
  if (json.pushed || applied) {
    await pushNotification({
      title: "Sinkron Spreadsheet selesai",
      body: `${json.pushed} transaksi dikirim, ${applied} diterima.`,
      kind: "sync",
    });
  }

  return { pushed: json.pushed, pulled: applied, total: json.total, at: json.at };
}

export async function lastSheetSync(): Promise<string | null> {
  return getSetting<string | null>(LAST_SHEET_SYNC, null);
}
