import type { Category, Wallet } from "./types";

type CategorySeed = Pick<Category, "id" | "name" | "type" | "icon" | "color" | "keywords">;
type WalletSeed = Pick<Wallet, "id" | "name" | "type" | "initial_balance" | "currency" | "color" | "icon">;

/**
 * `keywords` drive both OCR merchant→category matching and otomatis-categorize on
 * manual entry. Lowercase, Indonesian-first.
 */
export const DEFAULT_CATEGORIES: CategorySeed[] = [
  {
    id: "ca7e1000-e1ec-4000-8000-000000000001",
    name: "Makan & Minum",
    type: "expense",
    icon: "utensils",
    color: "#f97316",
    keywords: ["warung", "resto", "cafe", "kopi", "coffee", "mcd", "kfc", "bakso", "ayam", "nasi", "gofood", "grabfood", "shopeefood", "starbucks", "indomaret", "alfamart"],
  },
  {
    id: "ca7e1000-e1ec-4000-8000-000000000002",
    name: "Transportasi",
    type: "expense",
    icon: "car",
    color: "#3b82f6",
    keywords: ["gojek", "grab", "maxim", "bensin", "pertamina", "shell", "spbu", "parkir", "tol", "krl", "mrt", "transjakarta", "tiket", "damri"],
  },
  {
    id: "ca7e1000-e1ec-4000-8000-000000000003",
    name: "Belanja",
    type: "expense",
    icon: "shopping-bag",
    color: "#a855f7",
    keywords: ["tokopedia", "shopee", "lazada", "blibli", "bukalapak", "mall", "hypermart", "superindo", "transmart", "matahari", "uniqlo"],
  },
  {
    id: "ca7e1000-e1ec-4000-8000-000000000004",
    name: "Tagihan",
    type: "expense",
    icon: "receipt",
    color: "#0ea5e9",
    keywords: ["pln", "listrik", "pdam", "air", "internet", "indihome", "wifi", "pulsa", "telkomsel", "xl", "indosat", "gas", "iuran"],
  },
  {
    id: "ca7e1000-e1ec-4000-8000-000000000005",
    name: "Kesehatan",
    type: "expense",
    icon: "heart-pulse",
    color: "#ef4444",
    keywords: ["apotek", "kimia farma", "century", "rumah sakit", "klinik", "dokter", "bpjs", "obat", "vitamin"],
  },
  {
    id: "ca7e1000-e1ec-4000-8000-000000000006",
    name: "Hiburan",
    type: "expense",
    icon: "clapperboard",
    color: "#ec4899",
    keywords: ["netflix", "spotify", "disney", "bioskop", "xxi", "cgv", "game", "steam", "youtube premium", "vidio"],
  },
  {
    id: "ca7e1000-e1ec-4000-8000-000000000007",
    name: "Pendidikan",
    type: "expense",
    icon: "graduation-cap",
    color: "#14b8a6",
    keywords: ["kursus", "buku", "gramedia", "spp", "sekolah", "kampus", "udemy", "kelas"],
  },
  {
    id: "ca7e1000-e1ec-4000-8000-000000000008",
    name: "Rumah Tangga",
    type: "expense",
    icon: "home",
    color: "#8b5cf6",
    keywords: ["sabun", "detergen", "sewa", "kontrakan", "kost", "perabot", "ace hardware", "informa"],
  },
  {
    id: "ca7e1000-e1ec-4000-8000-000000000009",
    name: "Biaya Admin",
    type: "expense",
    icon: "landmark",
    color: "#64748b",
    keywords: ["admin", "biaya transfer", "pajak", "bunga", "materai", "top up fee"],
  },
  {
    id: "ca7e1000-e1ec-4000-8000-000000000010",
    name: "Lainnya",
    type: "expense",
    icon: "ellipsis",
    color: "#94a3b8",
    keywords: [],
  },
  {
    id: "ca7e1000-1c00-4000-8000-000000000001",
    name: "Gaji",
    type: "income",
    icon: "wallet",
    color: "#10b981",
    keywords: ["gaji", "salary", "payroll", "thr"],
  },
  {
    id: "ca7e1000-1c00-4000-8000-000000000002",
    name: "Bonus & Insentif",
    type: "income",
    icon: "gift",
    color: "#22c55e",
    keywords: ["bonus", "insentif", "komisi", "reward"],
  },
  {
    id: "ca7e1000-1c00-4000-8000-000000000003",
    name: "Freelance",
    type: "income",
    icon: "laptop",
    color: "#06b6d4",
    keywords: ["freelance", "project", "invoice", "honor"],
  },
  {
    id: "ca7e1000-1c00-4000-8000-000000000004",
    name: "Investasi",
    type: "income",
    icon: "trending-up",
    color: "#84cc16",
    keywords: ["dividen", "bunga deposito", "capital gain", "reksadana"],
  },
  {
    id: "ca7e1000-1c00-4000-8000-000000000005",
    name: "Pemasukan Lain",
    type: "income",
    icon: "circle-plus",
    color: "#4ade80",
    keywords: ["refund", "cashback", "hadiah", "titipan"],
  },
];

export const DEFAULT_WALLETS: WalletSeed[] = [
  {
    id: "0a11e700-ba11-4000-8000-000000000001",
    name: "Dompet Tunai",
    type: "cash",
    initial_balance: 0,
    currency: "IDR",
    color: "#0f9d76",
    icon: "banknote",
  },
];

export const WALLET_TYPE_LABEL: Record<Wallet["type"], string> = {
  cash: "Tunai",
  bank: "Bank",
  ewallet: "E-Wallet",
  credit: "Kartu Kredit",
  investment: "Investasi",
};

export const WALLET_COLORS = [
  "#0f9d76",
  "#3b82f6",
  "#a855f7",
  "#f97316",
  "#ef4444",
  "#0ea5e9",
  "#eab308",
  "#ec4899",
];
