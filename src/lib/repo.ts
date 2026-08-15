"use client";

import { db } from "./db";
import type {
  AppNotification,
  Bill,
  Budget,
  Category,
  Debt,
  ID,
  Receipt,
  SavingGoal,
  Salary,
  Transaction,
  Wallet,
} from "./types";
import { newId, nowISO, toDateKey } from "./utils";

type NewRow<T> = Omit<T, "id" | "created_at" | "updated_at" | "deleted"> &
  Partial<Pick<T & { id: ID }, "id">>;

let onMutationCallback: (() => void) | null = null;

export function registerMutationCallback(cb: () => void) {
  onMutationCallback = cb;
}

export function triggerMutationSync() {
  if (onMutationCallback) {
    onMutationCallback();
  }
}

/* ------------------------- mutation error reporting ------------------------ */

type MutationErrorHandler = (err: unknown) => void;
let onMutationError: MutationErrorHandler | null = null;

/** Register a global handler (e.g. toast) for failed Dexie writes. */
export function registerMutationErrorHandler(handler: MutationErrorHandler) {
  onMutationError = handler;
}

/** Log + notify the registered handler, then rethrow so callers can't proceed
 *  as if the write succeeded (no false-success toasts or closed dialogs). */
function reportMutationError(err: unknown): never {
  console.error("[repo] mutation failed:", err);
  onMutationError?.(err);
  throw err;
}

function stamp<T extends object>(input: T) {
  return {
    ...input,
    id: (input as { id?: ID }).id ?? newId(),
    created_at: nowISO(),
    updated_at: nowISO(),
    deleted: 0 as const,
  };
}

/* ---------------------------------- wallets --------------------------------- */

export async function createWallet(input: NewRow<Wallet>) {
  try {
    const row = stamp(input) as Wallet;
    await db().wallets.add(row);
    triggerMutationSync();
    return row;
  } catch (err) {
    reportMutationError(err);
  }
}

export async function updateWallet(id: ID, patch: Partial<Wallet>) {
  try {
    await db().wallets.update(id, { ...patch, updated_at: nowISO() });
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

export async function deleteWallet(id: ID, options?: { cascade?: boolean }) {
  try {
    const d = db();
    const linked = await d.transactions
      .filter((t) => !t.deleted && (t.wallet_id === id || t.to_wallet_id === id))
      .toArray();
    if (options?.cascade) {
      // cascade: soft-delete every linked transaction, then the wallet itself
      await Promise.all(
        linked.map((t) => d.transactions.update(t.id, { deleted: 1, updated_at: nowISO() })),
      );
      await d.wallets.update(id, { deleted: 1, updated_at: nowISO() });
      triggerMutationSync();
      return { archived: false, txCount: linked.length };
    }
    if (linked.length > 0) {
      // keep history intact — archive instead of destroying linked transactions
      await updateWallet(id, { archived: 1 });
      return { archived: true, txCount: linked.length };
    }
    await d.wallets.update(id, { deleted: 1, updated_at: nowISO() });
    triggerMutationSync();
    return { archived: false, txCount: 0 };
  } catch (err) {
    reportMutationError(err);
  }
}

/** initial_balance + income − expense + transfers in − transfers out. */
export async function walletBalance(walletId: ID): Promise<number> {
  const d = db();
  const wallet = await d.wallets.get(walletId);
  if (!wallet) return 0;
  const [outgoing, incoming] = await Promise.all([
    d.transactions.where("wallet_id").equals(walletId).toArray(),
    d.transactions.where("to_wallet_id").equals(walletId).toArray(),
  ]);
  let balance = wallet.initial_balance;
  for (const t of outgoing) {
    if (t.deleted) continue;
    if (t.type === "income") balance += t.amount;
    else balance -= t.amount; // expense + transfer out
  }
  for (const t of incoming) {
    if (t.deleted || t.type !== "transfer") continue;
    balance += t.amount;
  }
  return balance;
}

/** Set a wallet's balance to match real-world money by shifting `initial_balance`
 *  by the delta, so transaction history stays intact. Returns the new balance. */
export async function adjustWalletBalance(walletId: ID, targetBalance: number): Promise<number> {
  const wallet = await db().wallets.get(walletId);
  if (!wallet) return 0;
  const current = await walletBalance(walletId);
  const diff = targetBalance - current;
  await updateWallet(walletId, { initial_balance: wallet.initial_balance + diff });
  return targetBalance;
}

/** Balance per wallet, optionally cut off at `upToDate` (YYYY-MM-DD, inclusive)
 *  so the dashboard can show the balance at the end of a selected past month. */
export async function allWalletBalances(upToDate?: string): Promise<Record<ID, number>> {
  const d = db();
  const [wallets, txs] = await Promise.all([
    d.wallets.filter((w) => !w.deleted && !w.archived).toArray(),
    d.transactions.filter((t) => !t.deleted).toArray(),
  ]);
  const map: Record<ID, number> = {};
  for (const w of wallets) map[w.id] = w.initial_balance;
  for (const t of txs) {
    if (upToDate && t.date > upToDate) continue;
    if (t.wallet_id in map) {
      map[t.wallet_id] += t.type === "income" ? t.amount : -t.amount;
    }
    if (t.type === "transfer" && t.to_wallet_id && t.to_wallet_id in map) {
      map[t.to_wallet_id] += t.amount;
    }
  }
  return map;
}

/* -------------------------------- categories -------------------------------- */

export async function createCategory(input: NewRow<Category>) {
  try {
    const row = stamp(input) as Category;
    await db().categories.add(row);
    triggerMutationSync();
    return row;
  } catch (err) {
    reportMutationError(err);
  }
}

export async function updateCategory(id: ID, patch: Partial<Category>) {
  try {
    await db().categories.update(id, { ...patch, updated_at: nowISO() });
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

export async function deleteCategory(id: ID) {
  try {
    await db().categories.update(id, { deleted: 1, updated_at: nowISO() });
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

/** Best-effort category match from free text (merchant / note). */
export async function guessCategory(
  text: string,
  type: "income" | "expense",
): Promise<Category | undefined> {
  if (!text) return undefined;
  const haystack = text.toLowerCase();
  const cats = await db()
    .categories.filter((c) => !c.deleted && c.type === type)
    .toArray();
  let best: { cat: Category; score: number } | undefined;
  for (const cat of cats) {
    for (const kw of cat.keywords ?? []) {
      if (kw && haystack.includes(kw)) {
        const score = kw.length;
        if (!best || score > best.score) best = { cat, score };
      }
    }
  }
  return best?.cat;
}

/* ------------------------------- transactions ------------------------------- */

export async function createTransaction(input: NewRow<Transaction>) {
  try {
    const row = stamp(input) as Transaction;
    await db().transactions.add(row);
    await checkBudgetAlerts(row);
    triggerMutationSync();
    return row;
  } catch (err) {
    reportMutationError(err);
  }
}

export async function updateTransaction(id: ID, patch: Partial<Transaction>) {
  try {
    await db().transactions.update(id, { ...patch, updated_at: nowISO() });
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

export async function deleteTransaction(id: ID) {
  try {
    await db().transactions.update(id, { deleted: 1, updated_at: nowISO() });
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

export async function transactionsInRange(from: string, to: string) {
  return db()
    .transactions.where("date")
    .between(from, to, true, true)
    .filter((t) => !t.deleted)
    .toArray();
}

/* ---------------------------------- budgets --------------------------------- */

export async function createBudget(input: NewRow<Budget>) {
  try {
    const row = stamp(input) as Budget;
    await db().budgets.add(row);
    triggerMutationSync();
    return row;
  } catch (err) {
    reportMutationError(err);
  }
}

export async function updateBudget(id: ID, patch: Partial<Budget>) {
  try {
    await db().budgets.update(id, { ...patch, updated_at: nowISO() });
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

export async function deleteBudget(id: ID) {
  try {
    await db().budgets.update(id, { deleted: 1, updated_at: nowISO() });
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

/** Fires an in-app notification when a budget crosses 80% / 100%. */
async function checkBudgetAlerts(tx: Transaction) {
  if (tx.type !== "expense" || !tx.category_id) return;
  const monthKey = tx.date.slice(0, 7);
  const d = db();
  const budget = await d.budgets
    .filter(
      (b) => !b.deleted && b.category_id === tx.category_id && b.start_date.startsWith(monthKey),
    )
    .first();
  if (!budget) return;
  const spent = (
    await d.transactions
      .where("date")
      .between(`${monthKey}-01`, `${monthKey}-31`, true, true)
      .filter((t) => !t.deleted && t.type === "expense" && t.category_id === tx.category_id)
      .toArray()
  ).reduce((a, b) => a + b.amount, 0);
  const ratio = budget.amount > 0 ? spent / budget.amount : 0;
  if (ratio < 0.8) return;
  const cat = await d.categories.get(budget.category_id);
  const over = ratio >= 1;
  await pushNotification({
    title: over ? `Budget ${cat?.name ?? ""} terlampaui` : `Budget ${cat?.name ?? ""} hampir menyentuh batas`,
    body: over
      ? `Pengeluaran bulan ini ${Math.round(ratio * 100)}% dari budget.`
      : `Sudah terpakai ${Math.round(ratio * 100)}% dari budget bulan ini.`,
    kind: "budget",
    ref_id: budget.id,
  });
}

/* ----------------------------------- goals ---------------------------------- */

export async function createGoal(input: NewRow<SavingGoal>) {
  try {
    const row = stamp(input) as SavingGoal;
    await db().goals.add(row);
    triggerMutationSync();
    return row;
  } catch (err) {
    reportMutationError(err);
  }
}

export async function updateGoal(id: ID, patch: Partial<SavingGoal>) {
  try {
    await db().goals.update(id, { ...patch, updated_at: nowISO() });
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

export async function deleteGoal(id: ID) {
  try {
    await db().goals.update(id, { deleted: 1, updated_at: nowISO() });
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

export async function contributeToGoal(goalId: ID, amount: number) {
  try {
    const goal = await db().goals.get(goalId);
    if (!goal) return;
    await updateGoal(goalId, { saved_amount: Math.max(0, goal.saved_amount + amount) });
    if (goal.saved_amount + amount >= goal.target_amount) {
      await pushNotification({
        title: `Target "${goal.name}" tercapai`,
        body: "Selamat, target tabungan sudah penuh.",
        kind: "goal",
        ref_id: goal.id,
      });
    }
  } catch (err) {
    reportMutationError(err);
  }
}

/* ----------------------------------- bills ---------------------------------- */

export async function createBill(input: NewRow<Bill>) {
  try {
    const row = stamp(input) as Bill;
    await db().bills.add(row);
    triggerMutationSync();
    return row;
  } catch (err) {
    reportMutationError(err);
  }
}

export async function updateBill(id: ID, patch: Partial<Bill>) {
  try {
    await db().bills.update(id, { ...patch, updated_at: nowISO() });
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

export async function deleteBill(id: ID) {
  try {
    await db().bills.update(id, { deleted: 1, updated_at: nowISO() });
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

/** Mark paid → optionally records the expense and rolls the due date forward. */
export async function payBill(billId: ID, walletId?: ID) {
  try {
    const bill = await db().bills.get(billId);
    if (!bill) return;

    const actualAmount = bill.is_installment ? (bill.installment_amount_per_period ?? bill.amount) : bill.amount;

    if (bill.auto_create_tx && (walletId || bill.wallet_id)) {
      await createTransaction({
        type: "expense",
        amount: actualAmount,
        wallet_id: (walletId ?? bill.wallet_id)!,
        category_id: bill.category_id,
        date: toDateKey(),
        note: bill.is_installment 
          ? `Bayar cicilan: ${bill.name} (Ke-${(bill.installment_paid ?? 0) + 1} dari ${bill.installment_total ?? 1})`
          : `Bayar tagihan: ${bill.name}`,
        merchant: bill.name,
        tags: ["tagihan", bill.is_installment ? "cicilan" : ""].filter(Boolean),
        source: "manual",
      });
    }

    const next = nextDueDate(bill);
    
    if (bill.is_installment) {
      const paidTimes = (bill.installment_paid ?? 0) + 1;
      const isCompleted = paidTimes >= (bill.installment_total ?? 1);
      await updateBill(billId, {
        last_paid_at: nowISO(),
        due_date: isCompleted ? bill.due_date : (next ?? bill.due_date),
        installment_paid: paidTimes,
        archived: isCompleted ? 1 : 0,
      });
    } else {
      await updateBill(billId, {
        last_paid_at: nowISO(),
        due_date: next ?? bill.due_date,
        archived: next ? 0 : 1,
      });
    }
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

export function nextDueDate(bill: Bill): string | undefined {
  const d = new Date(bill.due_date);
  switch (bill.repeat) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly": {
      // setMonth tanpa clamp: 31 Jan + 1 bulan = 3 Mar (JS rollover).
      // Simpan hari asli, clamp ke hari terakhir bulan tujuan (29/30/31 Feb dst).
      const day = d.getDate();
      d.setMonth(d.getMonth() + 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, lastDay));
      break;
    }
    case "yearly":
      // 29 Feb + 1 tahun = 1 Mar (bukan tahun kabisat). Clamp ke 28 Feb.
      const month = d.getMonth();
      const day = d.getDate();
      d.setFullYear(d.getFullYear() + 1);
      const lastDayFeb = new Date(d.getFullYear(), month + 1, 0).getDate();
      if (month === 1 && day > lastDayFeb) d.setDate(lastDayFeb);
      break;
    default:
      return undefined;
  }
  return toDateKey(d);
}

/* ------------------------------- utang piutang ------------------------------ */

export async function createDebt(input: NewRow<Debt>) {
  try {
    const row = stamp(input) as Debt;
    await db().debts.add(row);
    triggerMutationSync();
    return row;
  } catch (err) {
    reportMutationError(err);
  }
}

export async function updateDebt(id: ID, patch: Partial<Debt>) {
  try {
    await db().debts.update(id, { ...patch, updated_at: nowISO() });
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

export async function deleteDebt(id: ID) {
  try {
    await db().debts.update(id, { deleted: 1, updated_at: nowISO() });
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

/**
 * Bayar utang (payable) / terima piutang (receivable). Kalau `auto_tx` aktif
 * sekalian bikin transaksi: bayar → expense, terima → income.
 */
export async function payDebt(debtId: ID, amount: number, walletId?: ID) {
  try {
    const debt = await db().debts.get(debtId);
    if (!debt) return;

    const remaining = debt.amount - debt.paid_amount;
    const paid = Math.min(Math.max(0, amount), remaining);
    if (paid <= 0) return;

    if (debt.auto_tx && (walletId || debt.wallet_id)) {
      const isPayable = debt.type === "payable";
      await createTransaction({
        type: isPayable ? "expense" : "income",
        amount: paid,
        wallet_id: walletId ?? debt.wallet_id!,
        date: toDateKey(),
        note: isPayable ? `Bayar utang: ${debt.person}` : `Terima piutang: ${debt.person}`,
        merchant: debt.person,
        tags: ["utang-piutang"],
        source: "manual",
      });
    }

    await updateDebt(debtId, { paid_amount: debt.paid_amount + paid });
  } catch (err) {
    reportMutationError(err);
  }
}

/* --------------------------------- receipts --------------------------------- */

export async function createReceipt(input: NewRow<Receipt>) {
  try {
    const row = stamp(input) as Receipt;
    await db().receipts.add(row);
    triggerMutationSync();
    return row;
  } catch (err) {
    reportMutationError(err);
  }
}

export async function updateReceipt(id: ID, patch: Partial<Receipt>) {
  try {
    await db().receipts.update(id, { ...patch, updated_at: nowISO() });
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

export async function deleteReceipt(id: ID) {
  try {
    await db().receipts.update(id, { deleted: 1, updated_at: nowISO() });
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

/* ------------------------------- notifications ------------------------------ */

export async function pushNotification(
  input: Omit<NewRow<AppNotification>, "read">,
): Promise<AppNotification> {
  try {
    const row = stamp({ ...input, read: 0 as const }) as AppNotification;
    await db().notifications.add(row);
    return row;
  } catch (err) {
    reportMutationError(err);
  }
}

export async function markNotificationRead(id: ID) {
  try {
    await db().notifications.update(id, { read: 1, updated_at: nowISO() });
  } catch (err) {
    reportMutationError(err);
  }
}

export async function markAllNotificationsRead() {
  try {
    const unread = await db()
      .notifications.filter((n) => !n.read && !n.deleted)
      .toArray();
    await Promise.all(unread.map((n) => markNotificationRead(n.id)));
  } catch (err) {
    reportMutationError(err);
  }
}

/**
 * Generates reminders for bills entering their reminder window. Idempotent per
 * bill+due_date so re-running on every app open does not spam.
 */
export async function runBillReminderScan(): Promise<number> {
  const d = db();
  const today = toDateKey();
  const bills = await d.bills.filter((b) => !b.deleted && !b.archived).toArray();
  const existing = await d.notifications.filter((n) => n.kind === "bill" && !n.deleted).toArray();
  let created = 0;
  for (const bill of bills) {
    const [y1, m1, d1] = bill.due_date.split("-").map(Number);
    const [y2, m2, d2] = today.split("-").map(Number);
    const daysLeft = Math.round(
      (Date.UTC(y1, m1 - 1, d1) - Date.UTC(y2, m2 - 1, d2)) / 86_400_000,
    );
    if (daysLeft > bill.reminder_days) continue;
    const marker = `${bill.id}:${bill.due_date}`;
    if (existing.some((n) => n.ref_id === marker)) continue;
    await pushNotification({
      title: daysLeft < 0 ? `Tagihan terlambat: ${bill.name}` : `Tagihan jatuh tempo: ${bill.name}`,
      body:
        daysLeft < 0
          ? `Lewat ${Math.abs(daysLeft)} hari dari jatuh tempo.`
          : daysLeft === 0
            ? "Jatuh tempo hari ini."
            : `Jatuh tempo dalam ${daysLeft} hari.`,
      kind: "bill",
      ref_id: marker,
    });
    created++;
  }
  return created;
}

export function getSalaryIdForMonth(month: string): string {
  const cleanMonth = month.replace("-", ""); // e.g. "202608"
  return `ca7e5a1a-0000-4000-8000-${cleanMonth.padStart(12, "0")}`;
}

export async function upsertSalary(month: string, amount: number) {
  try {
    const d = db();
    const id = getSalaryIdForMonth(month);
    const existing = await d.salaries.get(id);
    if (existing) {
      await d.salaries.update(id, { amount, updated_at: nowISO() });
    } else {
      await d.salaries.put({
        id,
        month,
        amount,
        created_at: nowISO(),
        updated_at: nowISO(),
        deleted: 0 as const,
      });
    }
    triggerMutationSync();
  } catch (err) {
    reportMutationError(err);
  }
}

export async function getSalaryForMonth(month: string) {
  const id = getSalaryIdForMonth(month);
  return await db().salaries.get(id);
}
