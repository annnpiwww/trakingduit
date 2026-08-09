"use client";

import * as React from "react";
import { cn, formatIDR } from "@/lib/utils";

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: number | string;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "income" | "expense" | "brand";
  className?: string;
}) {
  const tones = {
    neutral: { tile: "bg-surface-2 text-fg", value: "text-fg" },
    income: { tile: "bg-income/10 text-income", value: "text-income" },
    expense: { tile: "bg-expense/10 text-expense", value: "text-expense" },
    brand: { tile: "bg-brand/10 text-brand", value: "text-brand" },
  } as const;
  const t = tones[tone];

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-4 shadow-(--shadow-card) transition-shadow duration-200 hover:shadow-(--shadow-hover)",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", t.tile)}>
            <Icon className="size-4" />
          </span>
        ) : null}
        <span className="truncate text-xs font-medium text-muted">{label}</span>
      </div>
      <p className={cn("num mt-3 truncate text-xl font-bold tracking-tight sm:text-2xl", t.value)}>
        {typeof value === "number" ? formatIDR(value) : value}
      </p>
      {hint ? <div className="mt-1 text-[11px] text-muted">{hint}</div> : null}
    </div>
  );
}
