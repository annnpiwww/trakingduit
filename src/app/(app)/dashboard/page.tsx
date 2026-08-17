"use client";

import * as React from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  ChartPie,
  ChevronRight,
  ListOrdered,
  ScanText,
  Target,
  TrendingDown,
  WalletCards,
  AlertCircle,
  Sparkles,
  HandCoins,
} from "lucide-react";
import { db } from "@/lib/db";
import { allWalletBalances } from "@/lib/repo";
import { totals, type Totals } from "@/lib/analytics";
import type { Bill, Transaction } from "@/lib/types";
import { cn, formatIDR, monthRange, toDateKey, toMonthKey } from "@/lib/utils";
import {
  BalanceCard,
  Button,
  Card,
  CardHeader,
  EmptyState,
  MenuTile,
  Skeleton,
} from "@/components/ui";
import { useSession } from "@/lib/session";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { TransactionList } from "@/components/transactions/transaction-list";
import { TransactionSheet } from "@/components/transactions/transaction-sheet";
import { TraduChat } from "@/components/tradu/tradu-chat";

type MenuTone = "brand" | "income" | "expense" | "warn" | "accent";

type Mood = { emoji: string; label: string; tone: "good" | "warn" | "danger" | "muted" };

const MOOD_TEXT: Record<Mood["tone"], string> = {
  good: "text-emerald-200",
  warn: "text-amber-200",
  danger: "text-orange-200",
  muted: "text-white/70",
};

/** Mood duit dihitung dari data asli: sisa bulan ini dibagi pemasukan. */
function computeMood(t: Totals): Mood {
  if (t.count === 0) return { emoji: "👀", label: "Belum ada catatan bulan ini", tone: "muted" };
  if (t.net < 0) return { emoji: "🔥", label: "Waduh, bulan ini minus", tone: "danger" };
  const sr = t.income > 0 ? t.net / t.income : 1;
  if (sr >= 0.3) return { emoji: "🤑", label: "Duit aman, gemes", tone: "good" };
  if (sr >= 0.1) return { emoji: "😌", label: "Aman, tahan dikit dong", tone: "warn" };
  return { emoji: "⚠️", label: "Waduh dikit lagi duitmu habis, jangan terlalu boros ya", tone: "warn" };
}

function MoodPill({ mood }: { mood: Mood }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm",
        MOOD_TEXT[mood.tone],
      )}
    >
      <span className="shrink-0">{mood.emoji}</span>
      <span className="whitespace-nowrap">{mood.label}</span>
    </span>
  );
}

const QUICK: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: MenuTone;
}[] = [
  { href: "/scan", icon: ScanText, label: "Scan Struk", tone: "brand" },
  { href: "/transactions", icon: ListOrdered, label: "Transaksi", tone: "income" },
  { href: "/budgets", icon: TrendingDown, label: "Budget", tone: "expense" },
  { href: "/goals", icon: Target, label: "Target", tone: "warn" },
  { href: "/bills", icon: CalendarClock, label: "Tagihan", tone: "accent" },
  { href: "/analytics", icon: ChartPie, label: "Analisis", tone: "brand" },
  { href: "/wallets", icon: WalletCards, label: "Dompet", tone: "income" },
  { href: "/debts", icon: HandCoins, label: "Utang Piutang", tone: "accent" },
];

export default function DashboardPage() {
  const { profile } = useSession();
  const [month, setMonth] = React.useState(toMonthKey());
  const [hideBalance, setHideBalance] = React.useState(false);
  const [editing, setEditing] = React.useState<Transaction | null>(null);
  const [traduOpen, setTraduOpen] = React.useState(false);

  React.useEffect(() => {
    const val = localStorage.getItem("td.hideBalance") === "1";
    setHideBalance(val);
  }, []);

  const toggleHideBalance = () => {
    const next = !hideBalance;
    setHideBalance(next);
    localStorage.setItem("td.hideBalance", next ? "1" : "0");
  };

  const wallets = useLiveQuery(
    () => db().wallets.filter((w) => !w.deleted && !w.archived).sortBy("order"),
    [],
  );
  const categories = useLiveQuery(() => db().categories.filter((c) => !c.deleted).toArray(), []);
  const balances = useLiveQuery(
    async () => {
      await db().transactions.count();
      await db().wallets.count();
      // Balance at the end of the selected month (past month = snapshot then).
      return allWalletBalances(monthRange(month).to);
    },
    [month],
  );
  const monthTx = useLiveQuery(() => {
    const { from, to } = monthRange(month);
    return db()
      .transactions.where("date")
      .between(from, to, true, true)
      .filter((t) => !t.deleted)
      .toArray();
  }, [month]);

  // Get bills due within the selected month
  const bills = useLiveQuery(() => {
    const { from, to } = monthRange(month);
    return db()
      .bills.filter((b) => !b.deleted && !b.archived && b.due_date >= from && b.due_date <= to)
      .sortBy("due_date");
  }, [month]);

  const isLoading = wallets === undefined || monthTx === undefined || balances === undefined;

  const t = totals(monthTx ?? []);
  const totalBalance = Object.values(balances ?? {}).reduce((a, b) => a + b, 0);
  const mood = computeMood(t);
  
  // Only show 3 most recent transactions
  const recent = React.useMemo(
    () =>
      [...(monthTx ?? [])]
        .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
        .slice(0, 3),
    [monthTx],
  );

  // Only show 3 nearest bills
  const upcomingBills = bills?.slice(0, 3) ?? [];
  const billsTotal = upcomingBills.reduce((sum, bill) => sum + bill.amount, 0);

  const mask = (n: number) => (hideBalance ? "••••••" : formatIDR(n));
  
  // Use display_name if available, otherwise use name, remove email domain if present
  const rawName = profile?.display_name?.trim() || profile?.name?.trim() || "Kawan";
  const displayName = rawName.includes("@") ? rawName.split("@")[0] : rawName;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        <Skeleton className="h-36 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Greeting + month switcher - more compact */}
      <div className="flex w-full items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base leading-tight font-bold tracking-tight sm:text-xl">
              Hai, {displayName} 👋
            </p>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400" title="Dirgahayu Indonesia 🇮🇩">
              <span>🇮🇩</span>
              <span className="hidden xs:inline">17-an</span>
            </span>
          </div>
          <p className="mt-1 truncate text-[11px] text-muted sm:text-xs">Gimana duitmu hari ini?</p>
        </div>
        <div className="shrink-0">
          <MonthSwitcher value={month} onChange={setMonth} />
        </div>
      </div>

      {/* Balance hero */}
      <div data-tour="balance">
      <BalanceCard
        label="Total saldo"
        value={mask(totalBalance)}
        hidden={hideBalance}
        onToggleHide={toggleHideBalance}
        watermark="Rp"
        chip={<MoodPill mood={mood} />}
        sub={
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1">
              <ArrowDownLeft className="size-3.5" /> {mask(t.income)}
            </span>
            <span className="size-1 rounded-full bg-white/40" aria-hidden />
            <span className="flex items-center gap-1">
              <ArrowUpRight className="size-3.5" /> {mask(t.expense)}
            </span>
            <span className="size-1 rounded-full bg-white/40" aria-hidden />
            <span className="flex items-center gap-1">
              <ListOrdered className="size-3.5" /> {t.count} transaksi
            </span>
            <span className="size-1 rounded-full bg-white/40" aria-hidden />
            <span className="flex items-center gap-1">
              <WalletCards className="size-3.5" /> {wallets?.length ?? 0} dompet
            </span>
          </div>
        }
      />
      </div>

      {/* Tradu AI Chat Entry */}
      <button
        data-tour="tradu"
        onClick={() => setTraduOpen(true)}
        className="group flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 text-left shadow-(--shadow-card) transition-all duration-200 hover:-translate-y-0.5 hover:border-border/80 hover:shadow-(--shadow-hover)"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/15 to-brand/5 text-brand ring-1 ring-brand/10 transition-transform duration-200 group-hover:scale-105">
          <Sparkles className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold tracking-tight">Tanya Tradu ✨</span>
          <span className="mt-0.5 block truncate text-xs text-muted">
            Butuh analisa terkait keuanganmu? sini sharing sama tradu
          </span>
        </span>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-muted transition-all duration-200 group-hover:bg-brand group-hover:text-brand-fg">
          <ArrowRight className="size-3.5" />
        </span>
      </button>

      {/* Quick menu */}
      <section className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
        {QUICK.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="block"
            data-tour={a.href === "/debts" ? "tile-debts" : undefined}
          >
            <MenuTile icon={a.icon} label={a.label} tone={a.tone} className="h-full" />
          </Link>
        ))}
      </section>

      {/* Bills section - replaced Budget */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-tight">Tagihan</h3>
          <Link href="/bills" className="text-xs font-medium text-brand hover:underline">
            Kelola
          </Link>
        </div>
        {upcomingBills.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
              <span className="text-xs text-muted">Total tagihan</span>
              <span className="num text-sm font-semibold">{mask(billsTotal)}</span>
            </div>
            <div className="space-y-2">
              {upcomingBills.map((bill) => (
                <BillItem key={bill.id} bill={bill} mask={mask} />
              ))}
            </div>
            <p className="text-center text-xs text-muted">3 tagihan terdekat</p>
          </div>
        ) : (
          <EmptyState
            icon={CalendarClock}
            title="Belum ada tagihan"
            description="Tambahkan tagihan melalui halaman Tagihan."
            className="py-6"
          />
        )}
      </Card>

      {/* Recent transactions - max 3, no "Lihat Semua" button */}
      <Card className="overflow-hidden">
        <CardHeader title="Transaksi Terakhir" className="px-4 pt-4" />
        <div className="mt-2">
          {recent.length > 0 ? (
            <>
              <TransactionList
                transactions={recent}
                categories={categories ?? []}
                wallets={wallets ?? []}
                onSelect={setEditing}
              />
              <p className="px-4 pb-3 pt-2 text-center text-xs text-muted">
                3 transaksi terbaru
              </p>
            </>
          ) : (
            <div className="px-4 pb-4">
              <EmptyState
                icon={ListOrdered}
                title="Belum ada transaksi"
                description="Tambahkan transaksi pertama melalui tombol (+) atau halaman Transaksi."
                className="py-6"
              />
            </div>
          )}
        </div>
      </Card>

      <TransactionSheet
        open={Boolean(editing)}
        editing={editing}
        onClose={() => setEditing(null)}
      />

      <TraduChat
        open={traduOpen}
        onClose={() => setTraduOpen(false)}
      />
    </div>
  );
}

function BillItem({ bill, mask }: { bill: Bill; mask: (n: number) => string }) {
  const today = toDateKey();
  const isToday = bill.due_date === today;
  const isOverdue = bill.due_date < today;

  // Paid logic: for recurring bills, user may pay before due_date.
  // Consider paid if last_paid_at falls within the current billing cycle.
  const isPaid = (() => {
    if (!bill.last_paid_at) return false;
    const paidDate = bill.last_paid_at.slice(0, 10); // "YYYY-MM-DD"
    // Already covers: paid on or after due_date
    if (paidDate >= bill.due_date) return true;
    
    // Calculate the start of the current cycle for the next due date
    const cycleStart = (() => {
      const d = new Date(bill.due_date);
      switch (bill.repeat) {
        case "weekly":
          d.setDate(d.getDate() - 7);
          break;
        case "monthly":
          d.setMonth(d.getMonth() - 1);
          break;
        case "yearly":
          d.setFullYear(d.getFullYear() - 1);
          break;
        default:
          return null;
      }
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    })();

    if (!cycleStart) return false;

    // 1. If we haven't reached the new cycle start date yet (early payment / still in paid period)
    // 2. Or if the last payment was done today or in the future (just paid today)
    return today < cycleStart || paidDate >= today;
  })();

  const status = isPaid
    ? { label: "Lunas", color: "text-income" }
    : isOverdue
      ? { label: "Terlambat", color: "text-expense" }
      : isToday
        ? { label: "Jatuh tempo hari ini", color: "text-warn" }
        : { label: "Belum dibayar", color: "text-muted" };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          isPaid ? "bg-income/10" : isOverdue ? "bg-expense/10" : isToday ? "bg-warn/10" : "bg-surface-2",
        )}
      >
        <AlertCircle
          className={cn(
            "size-4",
            isPaid ? "text-income" : isOverdue ? "text-expense" : isToday ? "text-warn" : "text-muted",
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{bill.name}</p>
        <p className={cn("text-xs", status.color)}>{status.label}</p>
      </div>
      <div className="text-right">
        <p className="num text-sm font-semibold">{mask(bill.amount)}</p>
        <p className="text-xs text-muted">{formatDueDate(bill.due_date)}</p>
      </div>
    </div>
  );
}

function formatDueDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(d);
}
