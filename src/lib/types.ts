export type ID = string;
export type ISODate = string; // YYYY-MM-DD
export type ISOTime = string; // full ISO timestamp

export type TxType = "income" | "expense" | "transfer";
export type WalletType = "cash" | "bank" | "ewallet" | "credit" | "investment";
export type SyncTarget = "supabase" | "google-sheet";
export type SyncStatus = "success" | "error" | "partial";

/** Fields every syncable row carries (timestamp based conflict resolution). */
export interface Syncable {
  id: ID;
  created_at: ISOTime;
  updated_at: ISOTime;
  deleted: 0 | 1;
  /** Set once the row has been pushed to a remote target. */
  remote_rev?: ISOTime;
}

export interface Wallet extends Syncable {
  name: string;
  type: WalletType;
  initial_balance: number;
  currency: string;
  color: string;
  icon: string;
  note?: string;
  archived: 0 | 1;
  order: number;
}

export interface Category extends Syncable {
  name: string;
  type: Exclude<TxType, "transfer">;
  icon: string;
  color: string;
  is_default: 0 | 1;
  /** User can toggle this to hide category from transaction form. */
  active: 0 | 1;
  /** Keywords used by the OCR parser + auto-categorizer. */
  keywords: string[];
}

export interface Transaction extends Syncable {
  type: TxType;
  amount: number;
  wallet_id: ID;
  /** Destination wallet, transfers only. */
  to_wallet_id?: ID;
  category_id?: ID;
  date: ISODate;
  note?: string;
  merchant?: string;
  tags: string[];
  receipt_id?: ID;
  /** "manual" | "ocr" | "import" | "sheet" */
  source: TxSource;
}

export type TxSource = "manual" | "ocr" | "import" | "sheet";

export interface Budget extends Syncable {
  category_id: ID;
  amount: number;
  period: "monthly" | "weekly";
  /** Month key YYYY-MM for monthly budgets, ISO week start for weekly. */
  start_date: ISODate;
  rollover: 0 | 1;
}

export interface SavingGoal extends Syncable {
  name: string;
  target_amount: number;
  saved_amount: number;
  deadline?: ISODate;
  wallet_id?: ID;
  color: string;
  icon: string;
  archived: 0 | 1;
}

export interface Salary extends Syncable {
  month: string;
  amount: number;
}

export type DebtType = "payable" | "receivable";

/**
 * Utang piutang. "payable" = kita utang ke orang, "receivable" = orang utang
 * ke kita (piutang). Lunas saat paid_amount >= amount.
 */
export interface Debt extends Syncable {
  /** Nama orang lawan (yang ngutang / yang diutangi). */
  person: string;
  type: DebtType;
  amount: number;
  /** Total yang sudah dibayar / sudah diterima. */
  paid_amount: number;
  due_date?: ISODate;
  note?: string;
  /** Dompet default untuk transaksi otomatis saat bayar/terima. */
  wallet_id?: ID;
  /** Bikin transaksi otomatis (bayar utang → expense, terima piutang → income). */
  auto_tx: 0 | 1;
}

export interface Bill extends Syncable {
  name: string;
  amount: number;
  due_date: ISODate;
  repeat: "none" | "weekly" | "monthly" | "yearly";
  category_id?: ID;
  wallet_id?: ID;
  reminder_days: number;
  last_paid_at?: ISOTime;
  auto_create_tx: 0 | 1;
  archived: 0 | 1;
  // Installment fields
  is_installment?: 0 | 1;
  installment_total?: number; // Total cicilan (e.g., 8x)
  installment_paid?: number; // Sudah bayar berapa kali (e.g., 0)
  installment_amount_per_period?: number; // Nominal per periode (e.g., 1.170.000)
}

export interface ParsedReceipt {
  merchant?: string;
  address?: string;
  date?: ISODate;
  total?: number;
  subtotal?: number;
  tax?: number;
  items: { name: string; qty?: number; unit?: string; price: number }[];
  category_hint?: string;
  confidence: number;
}

export interface Receipt extends Syncable {
  /** data URL of the (downscaled) captured image */
  image?: string;
  raw_text: string;
  parsed: ParsedReceipt;
  status: "pending" | "confirmed" | "rejected";
  engine: "tesseract" | "google-vision" | "gemini" | "ai-ocr";
  transaction_id?: ID;
}

export interface AppNotification extends Syncable {
  title: string;
  body: string;
  kind: "bill" | "budget" | "goal" | "sync" | "info";
  read: 0 | 1;
  ref_id?: ID;
}

export interface SyncLog {
  id?: number;
  target: SyncTarget;
  direction: "push" | "pull" | "two-way";
  status: SyncStatus;
  pushed: number;
  pulled: number;
  message: string;
  at: ISOTime;
}

export interface Settings {
  key: string;
  value: unknown;
}

export interface UserProfile {
  id: ID;
  name: string;
  display_name?: string; // Display name untuk greeting (editable by user)
  email?: string;
  avatar_color: string;
  avatar_url?: string;
  /** 6 digit PIN hash for local-only mode. */
  pin_hash?: string;
  supabase_user_id?: string;
  created_at: ISOTime;
}
