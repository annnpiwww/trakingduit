"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, ScanLine } from "lucide-react";
import type { Category, ID, Transaction, Wallet } from "@/lib/types";
import { cn, formatDayLabel, formatIDR, groupBy } from "@/lib/utils";
import { DynIcon } from "@/components/ui/icon";
import { staggerContainer, staggerItem, getAnimation } from "@/lib/animations";

export function TransactionList({
  transactions,
  categories,
  wallets,
  onSelect,
  groupByDay = true,
  showDayNet = true,
  className,
}: {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  onSelect?: (tx: Transaction) => void;
  groupByDay?: boolean;
  /** Tampilkan net (+/-) di header per-hari. Dimatikan di halaman Transaksi biar bersih. */
  showDayNet?: boolean;
  className?: string;
}) {
  const catMap = React.useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])) as Record<ID, Category>,
    [categories],
  );
  const walletMap = React.useMemo(
    () => Object.fromEntries(wallets.map((w) => [w.id, w])) as Record<ID, Wallet>,
    [wallets],
  );

  const sorted = React.useMemo(
    () =>
      [...transactions].sort(
        (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at),
      ),
    [transactions],
  );

  if (!groupByDay) {
    return (
      <motion.ul
        className={cn("divide-y divide-border", className)}
        variants={getAnimation(staggerContainer)}
        initial="hidden"
        animate="visible"
      >
        {sorted.map((tx) => (
          <TransactionRow
            key={tx.id}
            tx={tx}
            category={tx.category_id ? catMap[tx.category_id] : undefined}
            wallet={walletMap[tx.wallet_id]}
            toWallet={tx.to_wallet_id ? walletMap[tx.to_wallet_id] : undefined}
            onSelect={onSelect}
          />
        ))}
      </motion.ul>
    );
  }

  const days = groupBy(sorted, (t) => t.date);
  const dayKeys = Object.keys(days).sort((a, b) => b.localeCompare(a));

  return (
    <div className={className}>
      {dayKeys.map((day) => {
        const items = days[day];
        const net = items.reduce(
          (acc, t) => acc + (t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : 0),
          0,
        );
        return (
          <motion.section
            key={day}
            variants={getAnimation(staggerContainer)}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center justify-between px-4 py-2 text-[11px] text-muted">
              <span className="font-medium">{formatDayLabel(day)}</span>
              {showDayNet ? (
                <span className={cn("num", net > 0 ? "text-income" : net < 0 ? "text-expense" : "")}>
                  {net > 0 ? "+" : ""}
                  {formatIDR(net)}
                </span>
              ) : null}
            </div>
            <motion.ul className="divide-y divide-border border-y border-border">
              {items.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  category={tx.category_id ? catMap[tx.category_id] : undefined}
                  wallet={walletMap[tx.wallet_id]}
                  toWallet={tx.to_wallet_id ? walletMap[tx.to_wallet_id] : undefined}
                  onSelect={onSelect}
                />
              ))}
            </motion.ul>
          </motion.section>
        );
      })}
    </div>
  );
}

function TransactionRow({
  tx,
  category,
  wallet,
  toWallet,
  onSelect,
}: {
  tx: Transaction;
  category?: Category;
  wallet?: Wallet;
  toWallet?: Wallet;
  onSelect?: (tx: Transaction) => void;
}) {
  const isTransfer = tx.type === "transfer";
  const color = isTransfer ? "#64748b" : (category?.color ?? "#94a3b8");
  const title = isTransfer
    ? `${wallet?.name ?? "?"} → ${toWallet?.name ?? "?"}`
    : tx.merchant || category?.name || (tx.type === "income" ? "Pemasukan" : "Pengeluaran");
  const subtitle = isTransfer
    ? (tx.note ?? "Transfer antar dompet")
    : [category?.name, wallet?.name, tx.note].filter(Boolean).join(" · ");

  return (
    <motion.li
      variants={getAnimation(staggerItem)}
      layout
      exit="exit"
    >
      <motion.button
        onClick={() => onSelect?.(tx)}
        className="flex w-full items-center gap-3 bg-surface px-4 py-3 text-left transition hover:bg-surface-2"
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.1 }}
      >
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full"
          style={{ background: `${color}1f`, color }}
        >
          {isTransfer ? (
            <ArrowLeftRight className="size-4.5" />
          ) : (
            <DynIcon name={category?.icon} className="size-4.5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{title}</span>
            {tx.source === "ocr" ? <ScanLine className="size-3 shrink-0 text-muted" /> : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">{subtitle}</span>
        </span>
        <span
          className={cn(
            "num shrink-0 text-sm font-semibold",
            tx.type === "income" ? "text-income" : tx.type === "expense" ? "text-expense" : "text-muted",
          )}
        >
          {tx.type === "income" ? "+" : tx.type === "expense" ? "−" : ""}
          {formatIDR(tx.amount)}
        </span>
      </motion.button>
    </motion.li>
  );
}
