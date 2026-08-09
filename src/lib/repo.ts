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
  const row = stamp(input) as Wallet;
  await db().wallets.add(row);
  triggerMutationSync();
  return row;
}

export async function updateWallet(id: ID, patch: Partial<Wallet>) {
  await db().wallets.update(id, { ...patch, updated_at: nowISO() });
  triggerMutationSync();
}

export async function deleteWallet(id: ID) {
  const txCount = await db().transactions.where("wallet_id").equals(id).count();
  if (txCount > 0) {
    // keep history intact — archive instead of destroying linked transactions
    await updateWallet(id, { archived: 1 });
    return { archived: true, txCount };
  }
  await db().wallets.update(id, { deleted: 1, updated_at: nowISO() });
  triggerMutationSync();
  return { archived: false, txCount };
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

export async function allWalletBalances(): Promise<Record<ID, number>> {
  const d = db();
  const [wallets, txs] = await Promise.all([
    d.wallets.filter((w) => !w.deleted && !w.archived).toArray(),
    d.transactions.filter((t) => !t.deleted).toArray(),
  ]);
  const map: Record<ID, number> = {};
  for (const w of wallets) map[w.id] = w.initial_balance;
  for (const t of txs) {
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
  const row = stamp(input) as Category;
  await db().categories.add(row);
  triggerMutationSync();
  return row;
}

export async function updateCategory(id: ID, patch: Partial<Category>) {
  await db().categories.update(id, { ...patch, updated_at: nowISO() });
  triggerMutationSync();
}

export async function deleteCategory(id: ID) {
  await db().categories.update(id, { deleted: 1, updated_at: nowISO() });
  triggerMutationSync();
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
  const row = stamp(input) as Transaction;
  await db().transactions.add(row);
  await checkBudgetAlerts(row);
  triggerMutationSync();
  return row;
}

export async function updateTransaction(id: ID, patch: Partial<Transaction>) {
  await db().transactions.update(id, { ...patch, updated_at: nowISO() });
  triggerMutationSync();
}

export async function deleteTransaction(id: ID) {
  await db().transactions.update(id, { deleted: 1, updated_at: nowISO() });
  triggerMutationSync();
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
  const row = stamp(input) as Budget;
  await db().budgets.add(row);
  triggerMutationSync();
  return row;
}

export async function updateBudget(id: ID, patch: Partial<Budget>) {
  await db().budgets.update(id, { ...patch, updated_at: nowISO() });
  triggerMutationSync();
}

export async function deleteBudget(id: ID) {
  await db().budgets.update(id, { deleted: 1, updated_at: nowISO() });
  triggerMutationSync();
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
  const ratio = spent / budget.amount;
  if (ratio < 0.8) return;
  const cat = await d.categories.get(budget.category_id);
  const over = ratio >= 1;
  await pushNotification({
    title: over ? `Budget ${cat?.name ?? ""} terlampaui` : `Budget ${cat?.name ?? ""} hampir habis`,
    body: over
      ? `Pengeluaran bulan ini ${Math.round(ratio * 100)}% dari budget.`
      : `Sudah terpakai ${Math.round(ratio * 100)}% dari budget bulan ini.`,
    kind: "budget",
    ref_id: budget.id,
  });
}

/* ----------------------------------- goals ---------------------------------- */

export async function createGoal(input: NewRow<SavingGoal>) {
  const row = stamp(input) as SavingGoal;
  await db().goals.add(row);
  triggerMutationSync();
  return row;
}

export async function updateGoal(id: ID, patch: Partial<SavingGoal>) {
  await db().goals.update(id, { ...patch, updated_at: nowISO() });
  triggerMutationSync();
}

export async function deleteGoal(id: ID) {
  await db().goals.update(id, { deleted: 1, updated_at: nowISO() });
  triggerMutationSync();
}

export async function contributeToGoal(goalId: ID, amount: number) {
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
}

/* ----------------------------------- bills ---------------------------------- */

export async function createBill(input: NewRow<Bill>) {
  const row = stamp(input) as Bill;
  await db().bills.add(row);
  triggerMutationSync();
  return row;
}

export async function updateBill(id: ID, patch: Partial<Bill>) {
  await db().bills.update(id, { ...patch, updated_at: nowISO() });
  triggerMutationSync();
}

export async function deleteBill(id: ID) {
  await db().bills.update(id, { deleted: 1, updated_at: nowISO() });
  triggerMutationSync();
}

/** Mark paid → optionally records the expense and rolls the due date forward. */
export async function payBill(billId: ID, walletId?: ID) {
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
}

export function nextDueDate(bill: Bill): string | undefined {
  const d = new Date(bill.due_date);
  switch (bill.repeat) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      return undefined;
  }
  return toDateKey(d);
}

/* ------------------------------- utang piutang ------------------------------ */

export async function createDebt(input: NewRow<Debt>) {
  const row = stamp(input) as Debt;
  await db().debts.add(row);
  triggerMutationSync();
  return row;
}

export async function updateDebt(id: ID, patch: Partial<Debt>) {
  await db().debts.update(id, { ...patch, updated_at: nowISO() });
  triggerMutationSync();
}

export async function deleteDebt(id: ID) {
  await db().debts.update(id, { deleted: 1, updated_at: nowISO() });
  triggerMutationSync();
}

/**
 * Bayar utang (payable) / terima piutang (receivable). Kalau `auto_tx` aktif
 * sekalian bikin transaksi: bayar → expense, terima → income.
 */
export async function payDebt(debtId: ID, amount: number, walletId?: ID) {
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
}

/* --------------------------------- receipts --------------------------------- */

export async function createReceipt(input: NewRow<Receipt>) {
  const row = stamp(input) as Receipt;
  await db().receipts.add(row);
  triggerMutationSync();
  return row;
}

export async function updateReceipt(id: ID, patch: Partial<Receipt>) {
  await db().receipts.update(id, { ...patch, updated_at: nowISO() });
  triggerMutationSync();
}

export async function deleteReceipt(id: ID) {
  await db().receipts.update(id, { deleted: 1, updated_at: nowISO() });
  triggerMutationSync();
}

/* ------------------------------- notifications ------------------------------ */

export async function pushNotification(
  input: Omit<NewRow<AppNotification>, "read">,
): Promise<AppNotification> {
  const row = stamp({ ...input, read: 0 as const }) as AppNotification;
  await db().notifications.add(row);
  return row;
}

export async function markNotificationRead(id: ID) {
  await db().notifications.update(id, { read: 1, updated_at: nowISO() });
}

export async function markAllNotificationsRead() {
  const unread = await db()
    .notifications.filter((n) => !n.read && !n.deleted)
    .toArray();
  await Promise.all(unread.map((n) => markNotificationRead(n.id)));
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
      title: daysLeft < 0 ? `Tagihan telat: ${bill.name}` : `Tagihan jatuh tempo: ${bill.name}`,
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
}

export async function getSalaryForMonth(month: string) {
  const id = getSalaryIdForMonth(month);
  return await db().salaries.get(id);
}
