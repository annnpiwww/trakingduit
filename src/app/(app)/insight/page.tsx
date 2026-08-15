"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Lightbulb, Sparkles, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { buildInsights, type InsightTone } from "@/lib/insight";
import { cn, toMonthKey } from "@/lib/utils";
import { Card, EmptyState, Skeleton } from "@/components/ui";
import { MonthSwitcher, monthLabel } from "@/components/layout/month-switcher";

const TONE_STYLE: Record<InsightTone, { icon: typeof Lightbulb; card: string; iconBox: string; labelBox: string }> = {
  positive: {
    icon: TrendingUp,
    card: "border-income/20 bg-income/5",
    iconBox: "bg-income/10 text-income",
    labelBox: "bg-income/10 text-income",
  },
  warning: {
    icon: TriangleAlert,
    card: "border-warn/20 bg-warn/5",
    iconBox: "bg-warn/10 text-warn",
    labelBox: "bg-warn/10 text-warn",
  },
  danger: {
    icon: TrendingDown,
    card: "border-expense/20 bg-expense/5",
    iconBox: "bg-expense/10 text-expense",
    labelBox: "bg-expense/10 text-expense",
  },
  neutral: {
    icon: Lightbulb,
    card: "border-brand/20 bg-brand/5",
    iconBox: "bg-brand/10 text-brand",
    labelBox: "bg-brand/10 text-brand",
  },
};

const TONE_LABEL: Record<InsightTone, string> = {
  positive: "Positif",
  warning: "Perhatian",
  danger: "Bahaya",
  neutral: "Info",
};

export default function InsightPage() {
  const [month, setMonth] = React.useState(toMonthKey());

  const transactions = useLiveQuery(() => db().transactions.filter((t) => !t.deleted).toArray(), []);
  const categories = useLiveQuery(() => db().categories.filter((c) => !c.deleted).toArray(), []);
  const budgets = useLiveQuery(() => db().budgets.filter((b) => !b.deleted).toArray(), []);
  const goals = useLiveQuery(() => db().goals.filter((g) => !g.archived).toArray(), []);

  const isLoading =
    transactions === undefined || categories === undefined || budgets === undefined || goals === undefined;

  const insights = React.useMemo(
    () =>
      buildInsights({
        month,
        transactions: transactions ?? [],
        categories: categories ?? [],
        budgets: budgets ?? [],
        goals: goals ?? [],
      }),
    [month, transactions, categories, budgets, goals],
  );

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">Insight</h1>
          <p className="text-xs text-muted">Analisa otomatis pola keuangan kamu</p>
        </div>
        <MonthSwitcher value={month} onChange={setMonth} className="self-start sm:self-auto" />
      </div>

      {insights.length ? (
        <ul className="space-y-3">
          {insights.map((insight) => {
            const s = TONE_STYLE[insight.tone];
            const Icon = s.icon;
            return (
              <li key={insight.id}>
                <Card className={cn("border p-4", s.card)}>
                  <div className="flex items-start gap-3">
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", s.iconBox)}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold tracking-tight">{insight.title}</h3>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                            s.labelBox,
                          )}
                        >
                          {TONE_LABEL[insight.tone]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{insight.body}</p>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card>
          <EmptyState
            icon={Sparkles}
            title="Belum ada insight"
            description="Catat transaksi dulu, insight bakal muncul otomatis."
          />
        </Card>
      )}

      <p className="px-1 text-[11px] text-muted">
        Insight {monthLabel(month)} dihitung offline dari data di perangkat.
      </p>
    </div>
  );
}
