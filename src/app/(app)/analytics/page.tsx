"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChartPie, Download, TrendingDown, TrendingUp, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import {
  byCategory,
  byWeekday,
  dailySeries,
  monthlySeries,
  recentMonths,
  topMerchants,
  totals,
} from "@/lib/analytics";
import { downloadFile, formatIDR, monthRange, pct, toMonthKey, cn } from "@/lib/utils";
import { toCSV } from "@/lib/export";
import { Button, Card, CardHeader, EmptyState, SegmentedControl, Skeleton } from "@/components/ui";
import { StatTile } from "@/components/ui/stat-tile";
import dynamic from "next/dynamic";
import { MonthSwitcher, monthLabel } from "@/components/layout/month-switcher";

// Recharts is heavy (~100KB+). Load only when /analytics is opened.
const CategoryDonut = dynamic(() =>
  import("@/components/charts").then((m) => m.CategoryDonut),
);
const DailyFlowChart = dynamic(() =>
  import("@/components/charts").then((m) => m.DailyFlowChart),
);
const MonthlyCompareChart = dynamic(() =>
  import("@/components/charts").then((m) => m.MonthlyCompareChart),
);
const NetTrendChart = dynamic(() =>
  import("@/components/charts").then((m) => m.NetTrendChart),
);
const WeekdayChart = dynamic(() =>
  import("@/components/charts").then((m) => m.WeekdayChart),
);

export default function AnalyticsPage() {
  const [month, setMonth] = React.useState(toMonthKey());
  const [scope, setScope] = React.useState<"expense" | "income">("expense");
  const [chartTab, setChartTab] = React.useState<"daily" | "trends" | "details">("daily");

  const categories = useLiveQuery(() => db().categories.filter((c) => !c.deleted).toArray(), []);
  const wallets = useLiveQuery(() => db().wallets.filter((w) => !w.deleted).toArray(), []);
  const allTx = useLiveQuery(() => db().transactions.filter((t) => !t.deleted).toArray(), []);

  const isLoading = allTx === undefined || categories === undefined || wallets === undefined;

  const months = React.useMemo(() => recentMonths(month, 6), [month]);
  const monthTx = React.useMemo(() => (allTx ?? []).filter((t) => t.date.startsWith(month)), [allTx, month]);
  const halfYearTx = React.useMemo(
    () => (allTx ?? []).filter((t) => months.some((m) => t.date.startsWith(m))),
    [allTx, months],
  );

  const t = totals(monthTx);
  const prevMonth = months[months.length - 2];
  const prevTotals = totals((allTx ?? []).filter((tx) => tx.date.startsWith(prevMonth ?? "")));
  const expenseDelta = prevTotals.expense
    ? Math.round(((t.expense - prevTotals.expense) / prevTotals.expense) * 100)
    : 0;

  const slices = React.useMemo(
    () => byCategory(monthTx, categories ?? [], scope),
    [monthTx, categories, scope],
  );

  const daily = React.useMemo(() => dailySeries(monthTx, month), [monthTx, month]);
  const monthly = React.useMemo(() => monthlySeries(halfYearTx, months), [halfYearTx, months]);
  const weekday = React.useMemo(() => byWeekday(monthTx), [monthTx]);
  const merchants = React.useMemo(() => topMerchants(monthTx), [monthTx]);

  const totalBalance = React.useMemo(() => {
    let balance = 0;
    for (const w of wallets ?? []) {
      if (w.archived) continue;
      balance += w.initial_balance;
    }
    for (const tx of allTx ?? []) {
      if (tx.type === "income") balance += tx.amount;
      else if (tx.type === "expense") balance -= tx.amount;
    }
    return balance;
  }, [wallets, allTx]);

  const finHealth = React.useMemo(() => {
    const income = t.income;
    const expense = t.expense;
    const net = t.net;
    
    // total saldo di dompet
    const balance = totalBalance;

    if (income === 0) {
      if (expense > 0) {
        return {
          score: Math.max(0, Math.min(100, Math.round(Number(balance > expense) * 30))),
          status: "Perlu perhatian",
          tone: "expense" as const,
          description: `Belum ada pemasukan tercatat, sementara pengeluaran sudah ${formatIDR(expense)} (${balance < 0 ? "saldo total minus" : `sisa saldo total: ${formatIDR(balance)}`}). Tambahkan pemasukan atau cek pengeluaran terdekat.`,
        };
      }
      return {
        score: 50,
        status: "Cukup",
        tone: "brand" as const,
        description: "Keuangan kamu masih sepi nih, belum ada pemasukan atau pengeluaran. Coba catat beberapa transaksi biar analisisnya makin akurat.",
      };
    }

    const expenseRatio = expense / income;
    const savingRatio = net / income; // rasio menabung
    const expensePercent = Math.round(expenseRatio * 100);

    // Skor dasar dari rasio menabung
    let score = Math.round(savingRatio * 100);
    // mapping -100% -> 0%, 0% -> 50%, 100% -> 100%
    if (score < -50) score = -50;
    let finalScore = Math.round(((score + 50) / 150) * 100);
    
    // Sesuaikan skor berdasarkan total saldo
    if (balance > expense * 3) {
      finalScore += 10; // Bonus punya dana darurat aman untuk 3 bulan
    } else if (balance < expense) {
      finalScore -= 15; // Penalty saldo total tipis dibanding pengeluaran
    }
    
    finalScore = Math.max(0, Math.min(100, finalScore));

    let status = "Perlu perhatian";
    let tone: "neutral" | "income" | "expense" | "brand" = "expense";
    let description = "";

    if (finalScore >= 80) {
      status = "Sangat Baik";
      tone = "income";
      description = `Pengeluaran tercatat ${expensePercent}% dari pemasukan, dengan sisa ${Math.round(savingRatio * 100)}%. Total saldo saat ini ${formatIDR(balance)}.`;

    } else if (finalScore >= 60) {
      status = "Baik";
      tone = "income";
      description = `Pengeluaran tercatat sekitar ${expensePercent}% dari pemasukan, jadi masih ada ruang untuk ditabung. Saldo saat ini ${formatIDR(balance)}.`;

    } else if (finalScore >= 40) {
      status = "Cukup";
      tone = "brand";
      description = `Sisa saldo ${formatIDR(balance)} setelah pengeluaran mengambil ${expensePercent}% dari pemasukan. Cek pengeluaran rutin sebelum menambah belanja baru.`;

    } else {
      status = "Perlu perhatian";
      tone = "expense";
      description = `Pengeluaran sudah ${expensePercent}% dari pemasukan dan sisa saldo ${formatIDR(balance)}. Prioritaskan kebutuhan terdekat sebelum pengeluaran tambahan.`;
    }

    return { score: finalScore, status, tone, description };
  }, [t.income, t.expense, t.net, totalBalance]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  function exportCsv() {
    const { from, to } = monthRange(month);
    const rows = (allTx ?? []).filter((tx) => tx.date >= from && tx.date <= to);
    downloadFile(`trackingduit-analitik-${month}.csv`, toCSV(rows, wallets ?? [], categories ?? []), "text/csv");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Analisis</h1>
            <p className="text-xs text-muted">Grafik pemasukan dan pengeluaran</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={exportCsv} 
            aria-label="Ekspor CSV"
            className="sm:hidden size-9"
          >
            <Download className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
          <MonthSwitcher value={month} onChange={setMonth} className="flex-1 sm:w-36" />
          <SegmentedControl
            value={scope}
            onChange={setScope}
            options={[
              { value: "expense", label: "Keluar" },
              { value: "income", label: "Masuk" },
            ]}
            className="flex-1 sm:flex-none"
          />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={exportCsv} 
            aria-label="Ekspor CSV"
            className="hidden sm:inline-flex size-9 shrink-0"
          >
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Uang masuk" value={t.income} tone="income" className="border-0 shadow-(--shadow-card)" />
        <StatTile
          label="Uang keluar"
          value={t.expense}
          tone="expense"
          className="border-0 shadow-(--shadow-card)"
          hint={
            prevMonth && prevTotals.expense ? (
              <span className="inline-flex items-center gap-1">
                {expenseDelta > 0 ? (
                  <TrendingUp className="size-3 text-expense" />
                ) : (
                  <TrendingDown className="size-3 text-income" />
                )}
                {Math.abs(expenseDelta)}% vs {monthLabel(prevMonth).split(" ")[0]}
              </span>
            ) : undefined
          }
        />
        <StatTile
          label="Sisa"
          value={t.net}
          tone={t.net >= 0 ? "income" : "expense"}
          className="border-0 shadow-(--shadow-card)"
        />
        <StatTile
          label="Skor Keuangan"
          value={`${finHealth.score}/100`}
          tone={finHealth.tone}
          className="border-0 shadow-(--shadow-card)"
          hint={finHealth.status}
        />
      </div>

      <Card className="p-4 border-brand/20 bg-brand/5 rounded-2xl">
        <h4 className="text-sm font-semibold text-brand flex items-center gap-1.5">
          <Sparkles className="size-4 shrink-0" /> Analisis Kesehatan Finansial
        </h4>
        <p className="text-xs text-muted mt-1 leading-relaxed">
          Kesehatan keuangan kamu dapet skor <span className="font-semibold text-fg">{finHealth.score}/100</span> ({finHealth.status}). {finHealth.description}
        </p>
      </Card>

      {t.count ? (
        <>
          <SegmentedControl
            value={chartTab}
            onChange={(v) => setChartTab(v as "daily" | "trends" | "details")}
            options={[
              { value: "daily", label: "Harian" },
              { value: "trends", label: "Tren 6 Bulan" },
              { value: "details", label: "Detail" },
            ]}
            className="w-full sm:w-auto"
          />

          {chartTab === "daily" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader title="Uang masuk-keluar harian" subtitle={monthLabel(month)} />
                <div className="px-2 pt-2 pb-3">
                  <DailyFlowChart data={daily} />
                </div>
              </Card>
              <Card>
                <CardHeader
                  title={`${scope === "expense" ? "Uang keluar ke mana saja" : "Uang masuk dari mana saja"}`}
                  subtitle={`${slices.length} kategori`}
                />
                <div className="px-2 pt-2 pb-3">
                  <CategoryDonut data={slices} />
                </div>
              </Card>
            </div>
          )}

          {chartTab === "trends" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader title="Perbandingan 6 bulan" subtitle="Uang masuk vs keluar" />
                <div className="px-2 pt-2 pb-3">
                  <MonthlyCompareChart data={monthly} />
                </div>
              </Card>
              <Card>
                <CardHeader title="Tren sisa bulanan" subtitle="Uang masuk - keluar" />
                <div className="px-2 pt-2 pb-3">
                  <NetTrendChart data={monthly} />
                </div>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader title="Uang keluar per hari" subtitle="Pola mingguan" />
                <div className="px-2 pt-2 pb-3">
                  <WeekdayChart data={weekday} />
                </div>
              </Card>
            </div>
          )}

          {chartTab === "details" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader title="Tempat belanja favorit" subtitle="Total belanja terbanyak" />
                <ul className="divide-y divide-border">
                  {merchants.length ? (
                    merchants.map((m, i) => (
                      <li key={m.name} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="num w-5 text-xs text-muted">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{m.name}</span>
                          <span className="text-[11px] text-muted">{m.count}× transaksi</span>
                        </span>
                        <span className="num text-sm font-medium">{formatIDR(m.total)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-6 text-center text-xs text-muted">
                      Isi nama tempat belanja buat liat rankingnya.
                    </li>
                  )}
                </ul>
              </Card>
              <Card>
                <CardHeader title="Detail per kategori" subtitle={monthLabel(month)} />
                <ul className="divide-y divide-border">
                  {slices.map((c) => (
                    <li key={c.category_id} className="flex items-center gap-3 px-4 py-3">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{c.name}</span>
                        <span className="text-[11px] text-muted">{c.count} transaksi</span>
                      </span>
                      <span className="text-right">
                        <span className="num block text-sm font-medium">{formatIDR(c.total)}</span>
                        <span className="text-[11px] text-muted">{pct(c.total, t[scope])}%</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </>
      ) : (
        <Card>
          <EmptyState
            icon={ChartPie}
            title="Belum ada data buat dianalisis"
            description="Catat beberapa transaksi dulu, nanti grafiknya muncul otomatis."
          />
        </Card>
      )}
    </div>
  );
}
