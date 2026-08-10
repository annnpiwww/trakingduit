"use client";

import { db } from "./db";
import { detectDelimiter, parseCSV } from "./export";
import { createTransaction, guessCategory } from "./repo";
import type { ID, TxType } from "./types";
import { parseAmount, toDateKey } from "./utils";

export interface ColumnMap {
  date: number;
  description: number;
  amount: number;
  /** Separate debit/credit columns, as most Indonesian bank exports use. */
  debit?: number;
  credit?: number;
  type?: number;
}

export interface ImportPreviewRow {
  date: string;
  description: string;
  amount: number;
  type: TxType;
  include: boolean;
}

export interface ImportPreview {
  headers: string[];
  rows: ImportPreviewRow[];
  map: ColumnMap;
  skipped: number;
}

const DATE_HINTS = ["tanggal", "date", "tgl", "waktu", "posting"];
const DESC_HINTS = ["keterangan", "deskripsi", "description", "uraian", "berita", "catatan", "merchant"];
const AMOUNT_HINTS = ["nominal", "jumlah", "amount", "nilai", "mutasi"];
const DEBIT_HINTS = ["debit", "debet", "keluar", "pengeluaran", "withdrawal"];
const CREDIT_HINTS = ["kredit", "credit", "masuk", "pemasukan", "deposit"];

function findColumn(headers: string[], hints: string[]): number | undefined {
  const idx = headers.findIndex((h) => hints.some((hint) => h.toLowerCase().includes(hint)));
  return idx >= 0 ? idx : undefined;
}

/** dd/mm/yyyy, yyyy-mm-dd, dd-mm-yy → YYYY-MM-DD */
function normalizeDate(raw: string): string | undefined {
  const s = raw.trim();
  let m = s.match(/(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? undefined : toDateKey(parsed);
}

/** Reads a bank/e-wallet CSV export and guesses its column layout. */
export function previewCSV(text: string): ImportPreview {
  const delimiter = detectDelimiter(text);
  const table = parseCSV(text, delimiter);
  if (!table.length) return { headers: [], rows: [], map: { date: 0, description: 1, amount: 2 }, skipped: 0 };

  const headers = table[0].map((h) => h.trim());
  const body = table.slice(1);

  const map: ColumnMap = {
    date: findColumn(headers, DATE_HINTS) ?? 0,
    description: findColumn(headers, DESC_HINTS) ?? 1,
    amount: findColumn(headers, AMOUNT_HINTS) ?? 2,
    debit: findColumn(headers, DEBIT_HINTS),
    credit: findColumn(headers, CREDIT_HINTS),
  };

  const rows: ImportPreviewRow[] = [];
  let skipped = 0;

  for (const raw of body) {
    const date = normalizeDate(raw[map.date] ?? "");
    if (!date) {
      skipped++;
      continue;
    }
    const debit = map.debit != null ? parseAmount(raw[map.debit] ?? "") : 0;
    const credit = map.credit != null ? parseAmount(raw[map.credit] ?? "") : 0;
    let amount = 0;
    let type: TxType = "expense";

    if (debit || credit) {
      amount = debit || credit;
      type = credit && !debit ? "income" : "expense";
    } else {
      const value = parseAmount(raw[map.amount] ?? "");
      amount = Math.abs(value);
      type = value > 0 ? "income" : "expense";
      // exports without a sign column are treated as expenses
      if (!/[-(]/.test(raw[map.amount] ?? "") && value > 0 && map.credit == null) type = "expense";
    }

    if (!amount) {
      skipped++;
      continue;
    }

    rows.push({
      date,
      description: (raw[map.description] ?? "").trim().slice(0, 120),
      amount,
      type,
      include: true,
    });
  }

  return { headers, rows, map, skipped };
}

export interface ImportResult {
  imported: number;
  duplicates: number;
}

/**
 * Writes the selected preview rows as transactions. Rows matching an existing
 * transaction on date + amount + merchant are treated as duplicates and skipped.
 */
export async function commitImport(
  rows: ImportPreviewRow[],
  walletId: ID,
): Promise<ImportResult> {
  const selected = rows.filter((r) => r.include);
  if (!selected.length) return { imported: 0, duplicates: 0 };

  const existing = await db()
    .transactions.filter((t) => !t.deleted)
    .toArray();
  const seen = new Set(
    existing.map((t) => `${t.date}|${t.amount}|${(t.merchant ?? "").toLowerCase()}`),
  );

  let imported = 0;
  let duplicates = 0;

  for (const row of selected) {
    const key = `${row.date}|${row.amount}|${row.description.toLowerCase()}`;
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    const guess = await guessCategory(row.description, row.type === "income" ? "income" : "expense");
    await createTransaction({
      type: row.type,
      amount: row.amount,
      wallet_id: walletId,
      category_id: guess?.id,
      date: row.date,
      merchant: row.description || undefined,
      note: undefined,
      tags: ["import"],
      source: "import",
    });
    seen.add(key);
    imported++;
  }

  return { imported, duplicates };
}

/* --------------------------------- backup --------------------------------- */

export async function exportBackup(): Promise<string> {
  const d = db();
  const [wallets, categories, transactions, budgets, goals, bills, debts, salaries, receipts, notifications, settings, profile] =
    await Promise.all([
      d.wallets.toArray(),
      d.categories.toArray(),
      d.transactions.toArray(),
      d.budgets.toArray(),
      d.goals.toArray(),
      d.bills.toArray(),
      d.debts.toArray(),
      d.salaries.toArray(),
      d.receipts.toArray(),
      d.notifications.toArray(),
      d.settings.toArray(),
      d.profile.toArray(),
    ]);
  return JSON.stringify(
    {
      app: "trackingduit",
      version: 2,
      exported_at: new Date().toISOString(),
      data: { wallets, categories, transactions, budgets, goals, bills, debts, salaries, receipts, notifications, settings, profile },
    },
    null,
    2,
  );
}

export async function importBackup(json: string): Promise<number> {
  const parsed = JSON.parse(json) as {
    app?: string;
    data?: Record<string, unknown[]>;
  };
  if (parsed.app !== "trackingduit" || !parsed.data) {
    throw new Error("File backup tidak dikenali");
  }
  const d = db();
  const map: Record<string, { bulkPut: (rows: never[]) => Promise<unknown> }> = {
    wallets: d.wallets,
    categories: d.categories,
    transactions: d.transactions,
    budgets: d.budgets,
    goals: d.goals,
    bills: d.bills,
    debts: d.debts,
    salaries: d.salaries,
    receipts: d.receipts,
    notifications: d.notifications,
    settings: d.settings,
    profile: d.profile,
  };
  let restored = 0;
  for (const [key, rows] of Object.entries(parsed.data)) {
    const table = map[key];
    if (!table || !Array.isArray(rows)) continue;
    await table.bulkPut(rows as never[]);
    restored += rows.length;
  }
  return restored;
}
