import {
  averageDailySpend,
  byCategory,
  byWeekday,
  monthlySeries,
  projectedMonthExpense,
  recentMonths,
  savingsRate,
  topMerchants,
  totals,
} from "./analytics";
import type { Budget, Category, SavingGoal, Transaction } from "./types";
import { formatIDR, monthRange, pct, toDateKey } from "./utils";

export type InsightTone = "positive" | "warning" | "danger" | "neutral";

export interface Insight {
  id: string;
  title: string;
  body: string;
  tone: InsightTone;
  /** Higher shows first. */
  weight: number;
}

export interface InsightInput {
  month: string;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  goals: SavingGoal[];
}

/**
 * Rule-based insight engine — runs fully offline. The optional /api/insight
 * route layers an LLM summary on top when a key is configured.
 */
export function buildInsights({
  month,
  transactions,
  categories,
  budgets,
  goals,
}: InsightInput): Insight[] {
  const monthTx = transactions.filter((t) => t.date.startsWith(month));
  const t = totals(monthTx);
  const out: Insight[] = [];

  if (!t.count) {
    return [
      {
        id: "empty",
        title: "Belum ada data bulan ini",
        body: "Catat minimal 5 transaksi supaya analisis bisa dihitung.",
        tone: "neutral",
        weight: 0,
      },
    ];
  }

  /* cash flow */
  if (t.net < 0) {
    out.push({
      id: "negative-net",
      title: "Pengeluaran melebihi pemasukan",
      body: `Bulan ini minus ${formatIDR(Math.abs(t.net))}. Cek kategori terbesar dan tekan pengeluaran yang belum wajib.`,
      tone: "danger",
      weight: 100,
    });
  } else {
    const rate = savingsRate(t);
    out.push({
      id: "savings-rate",
      title: `Rasio menabung ${Math.round(rate * 100)}%`,
      body:
        rate >= 0.2
          ? `Sisa ${formatIDR(t.net)} dari pemasukan. Sudah di atas patokan aman 20%.`
          : `Sisa ${formatIDR(t.net)}. Patokan sehat 20% - perlu naik ${formatIDR(t.income * 0.2 - t.net)} lagi.`,
      tone: rate >= 0.2 ? "positive" : "warning",
      weight: 70,
    });
  }

  /* burn rate projection */
  const today = toDateKey();
  if (today.startsWith(month)) {
    const projected = projectedMonthExpense(monthTx, month);
    const daysInMonth = Number(monthRange(month).to.slice(-2));
    const elapsed = Number(today.slice(-2));
    if (elapsed >= 5 && projected > t.expense * 1.05) {
      out.push({
        id: "projection",
        title: `Perkiraan akhir bulan ${formatIDR(projected)}`,
        body: `Laju ${formatIDR(averageDailySpend(monthTx, month))}/hari. Sisa ${daysInMonth - elapsed} hari lagi${
          t.income ? `, batas aman ${formatIDR(t.income * 0.8)}.` : "."
        }`,
        tone: projected > t.income && t.income ? "warning" : "neutral",
        weight: 80,
      });
    }
  }

  /* dominant category */
  const slices = byCategory(monthTx, categories, "expense");
  const top = slices[0];
  if (top && top.share >= 0.35) {
    out.push({
      id: "dominant-category",
      title: `${top.name} menyerap ${Math.round(top.share * 100)}% pengeluaran`,
      body: `Total ${formatIDR(top.total)} dari ${top.count} transaksi. Kategori ini paling berdampak kalau mau hemat.`,
      tone: "warning",
      weight: 75,
    });
  }

  /* month over month */
  const months = recentMonths(month, 4);
  const series = monthlySeries(
    transactions.filter((tx) => months.some((m) => tx.date.startsWith(m))),
    months,
  );
  const prev = series[series.length - 2];
  if (prev && prev.expense > 0) {
    const delta = Math.round(((t.expense - prev.expense) / prev.expense) * 100);
    if (Math.abs(delta) >= 15) {
      out.push({
        id: "mom",
        title: `Pengeluaran ${delta > 0 ? "naik" : "turun"} ${Math.abs(delta)}% dari bulan lalu`,
        body: `${formatIDR(prev.expense)} → ${formatIDR(t.expense)}.`,
        tone: delta > 0 ? "warning" : "positive",
        weight: 65,
      });
    }
  }

  /* budgets */
  const monthBudgets = budgets.filter((b) => b.start_date.startsWith(month));
  for (const b of monthBudgets) {
    const spent = monthTx
      .filter((tx) => tx.type === "expense" && tx.category_id === b.category_id)
      .reduce((a, x) => a + x.amount, 0);
    const ratio = pct(spent, b.amount);
    if (ratio < 80) continue;
    const cat = categories.find((c) => c.id === b.category_id);
    out.push({
      id: `budget-${b.id}`,
      title:
        ratio >= 100
          ? `Budget ${cat?.name ?? "kategori"} terlewati ${ratio - 100}%`
          : `Budget ${cat?.name ?? "kategori"} tersisa ${formatIDR(b.amount - spent)}`,
      body: `Terpakai ${formatIDR(spent)} dari ${formatIDR(b.amount)}.`,
      tone: ratio >= 100 ? "danger" : "warning",
      weight: ratio >= 100 ? 90 : 60,
    });
  }

  /* weekday pattern */
  const weekday = byWeekday(monthTx);
  const peak = [...weekday].sort((a, b) => b.expense - a.expense)[0];
  const weekTotal = weekday.reduce((a, b) => a + b.expense, 0);
  if (peak && weekTotal && peak.expense / weekTotal >= 0.28) {
    out.push({
      id: "weekday",
      title: `Hari ${peak.day} paling banyak menghabiskan uang`,
      body: `${formatIDR(peak.expense)} atau ${Math.round((peak.expense / weekTotal) * 100)}% pengeluaran bulan ini jatuh di hari itu.`,
      tone: "neutral",
      weight: 40,
    });
  }

  /* merchant repetition */
  const merchant = topMerchants(monthTx, 1)[0];
  if (merchant && merchant.count >= 5) {
    out.push({
      id: "merchant",
      title: `${merchant.count}× belanja di ${merchant.name}`,
      body: `Total ${formatIDR(merchant.total)}, rata-rata ${formatIDR(merchant.total / merchant.count)} per transaksi.`,
      tone: "neutral",
      weight: 45,
    });
  }

  /* small leaks */
  const smallTx = monthTx.filter((tx) => tx.type === "expense" && tx.amount <= 25_000);
  if (smallTx.length >= 15) {
    const smallTotal = smallTx.reduce((a, b) => a + b.amount, 0);
    out.push({
      id: "small-leaks",
      title: `Bocor halus ${formatIDR(smallTotal)}`,
      body: `${smallTx.length} transaksi kecil (≤ ${formatIDR(25_000)}) meterkumpul jadi ${pct(smallTotal, t.expense)}% pengeluaran.`,
      tone: "warning",
      weight: 55,
    });
  }

  /* goals */
  const activeGoals = goals.filter((g) => !g.archived && g.saved_amount < g.target_amount);
  if (activeGoals.length && t.net > 0) {
    const g = activeGoals[0];
    const need = g.target_amount - g.saved_amount;
    const months = Math.ceil(need / Math.max(1, t.net));
    out.push({
      id: `goal-${g.id}`,
      title: `Target "${g.name}" tercapai ~${months} bulan lagi`,
      body: `Kurang ${formatIDR(need)}. Dengan sisa ${formatIDR(t.net)}/bulan seperti sekarang.`,
      tone: "positive",
      weight: 50,
    });
  }

  return out.sort((a, b) => b.weight - a.weight);
}

/** Compact payload the /api/insight route sends to the model. */
export function buildInsightPayload(input: InsightInput) {
  const monthTx = input.transactions.filter((t) => t.date.startsWith(input.month));
  const t = totals(monthTx);
  return {
    month: input.month,
    currency: "IDR",
    totals: { income: t.income, expense: t.expense, net: t.net, transactions: t.count },
    average_daily_expense: Math.round(averageDailySpend(monthTx, input.month)),
    projected_month_expense: Math.round(projectedMonthExpense(monthTx, input.month)),
    savings_rate: Number(savingsRate(t).toFixed(3)),
    by_category: byCategory(monthTx, input.categories, "expense")
      .slice(0, 8)
      .map((c) => ({ name: c.name, total: c.total, share: Number(c.share.toFixed(3)), count: c.count })),
    top_merchants: topMerchants(monthTx, 5),
    monthly_trend: monthlySeries(input.transactions, recentMonths(input.month, 4)).map((m) => ({
      month: m.month,
      income: m.income,
      expense: m.expense,
    })),
    budgets: input.budgets
      .filter((b) => b.start_date.startsWith(input.month))
      .map((b) => {
        const cat = input.categories.find((c) => c.id === b.category_id);
        const spent = monthTx
          .filter((tx) => tx.type === "expense" && tx.category_id === b.category_id)
          .reduce((a, x) => a + x.amount, 0);
        return { category: cat?.name ?? "-", limit: b.amount, spent };
      }),
    goals: input.goals
      .filter((g) => !g.archived)
      .map((g) => ({ name: g.name, target: g.target_amount, saved: g.saved_amount, deadline: g.deadline })),
  };
}
