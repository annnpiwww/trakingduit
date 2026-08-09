"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, ListOrdered, Plus, Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { db } from "@/lib/db";
import { totals } from "@/lib/analytics";
import type { Transaction, TxType } from "@/lib/types";
import { downloadFile, formatIDR, monthRange, toMonthKey } from "@/lib/utils";
import { Button, Card, EmptyState, Input, Select, SegmentedControl, Skeleton } from "@/components/ui";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { TransactionList } from "@/components/transactions/transaction-list";
import { TransactionSheet } from "@/components/transactions/transaction-sheet";
import { toCSV } from "@/lib/export";

export default function TransactionsPage() {
  const [month, setMonth] = React.useState(toMonthKey());
  const [type, setType] = React.useState<TxType | "all">("all");
  const [walletId, setWalletId] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(false);
  const [editing, setEditing] = React.useState<Transaction | null>(null);
  const [adding, setAdding] = React.useState(false);

  const wallets = useLiveQuery(() => db().wallets.filter((w) => !w.deleted).sortBy("order"), []);
  const categories = useLiveQuery(() => db().categories.filter((c) => !c.deleted).toArray(), []);
  const monthTx = useLiveQuery(
    () => {
      const { from, to } = monthRange(month);
      return db()
        .transactions.where("date")
        .between(from, to, true, true)
        .filter((t) => !t.deleted)
        .toArray();
    },
    [month],
  );

  const isLoading = monthTx === undefined || wallets === undefined || categories === undefined;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return (monthTx ?? []).filter((t) => {
      if (type !== "all" && t.type !== type) return false;
      if (walletId && t.wallet_id !== walletId && t.to_wallet_id !== walletId) return false;
      if (categoryId && t.category_id !== categoryId) return false;
      if (q) {
        const hay = `${t.merchant ?? ""} ${t.note ?? ""} ${t.amount}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [monthTx, type, walletId, categoryId, query]);

  const t = totals(filtered);
  const activeFilters = [walletId, categoryId, query, type !== "all" ? type : ""].filter(Boolean).length;

  // Pagination states & clamp
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

  React.useEffect(() => {
    setCurrentPage((prev) => Math.min(Math.max(1, prev), totalPages));
  }, [filtered.length, totalPages]);

  const paginatedTransactions = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  function getPaginationRange(current: number, total: number) {
    const siblings = 1;
    const range: (number | "ellipsis")[] = [];

    if (total <= 5) {
      for (let i = 1; i <= total; i++) range.push(i);
      return range;
    }

    range.push(1);

    const leftSiblingIdx = Math.max(current - siblings, 2);
    const rightSiblingIdx = Math.min(current + siblings, total - 1);

    const shouldShowLeftEllipsis = leftSiblingIdx > 2;
    const shouldShowRightEllipsis = rightSiblingIdx < total - 1;

    if (shouldShowLeftEllipsis) {
      range.push("ellipsis");
    }

    for (let i = leftSiblingIdx; i <= rightSiblingIdx; i++) {
      range.push(i);
    }

    if (shouldShowRightEllipsis) {
      range.push("ellipsis");
    }

    range.push(total);
    return range;
  }

  function exportCsv() {
    const csv = toCSV(filtered, wallets ?? [], categories ?? []);
    downloadFile(`trackingduit-${month}.csv`, csv, "text/csv;charset=utf-8");
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">Transaksi</h1>
          <p className="text-xs text-muted">Semua catatan bulan ini</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="icon" onClick={exportCsv} aria-label="Ekspor CSV" className="size-9">
            <Download className="size-4" />
          </Button>
          <Button onClick={() => setAdding(true)} className="sm:px-4 px-2.5 h-9 sm:h-10">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Catat transaksi</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <MonthSwitcher value={month} onChange={setMonth} className="flex-1 sm:w-36" />
          <Button
            variant={showFilters || activeFilters ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowFilters((v) => !v)}
            aria-label="Filter"
            className="sm:hidden size-9 shrink-0"
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 w-full flex-1">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari merchant, catatan, nominal…"
              className="pl-9 w-full text-xs sm:text-sm placeholder:text-[10px] sm:placeholder:text-xs h-9 sm:h-10"
            />
          </div>
          <Button
            variant={showFilters || activeFilters ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowFilters((v) => !v)}
            aria-label="Filter"
            className="hidden sm:inline-flex size-9 shrink-0"
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      {showFilters ? (
        <Card className="grid gap-3 p-4 sm:grid-cols-3">
          <SegmentedControl
            className="sm:col-span-3"
            value={type}
            onChange={setType}
            options={[
              { value: "all", label: "Semua" },
              { value: "expense", label: "Keluar" },
              { value: "income", label: "Masuk" },
              { value: "transfer", label: "Transfer" },
            ]}
          />
          <Select value={walletId} onChange={(e) => setWalletId(e.target.value)}>
            <option value="">Semua dompet</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Button
            variant="ghost"
            onClick={() => {
              setWalletId("");
              setCategoryId("");
              setType("all");
              setQuery("");
            }}
          >
            <X className="size-4" /> Reset
          </Button>
        </Card>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-[11px] text-muted">Masuk</p>
          <p className="num text-sm font-semibold text-income">{formatIDR(t.income)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] text-muted">Keluar</p>
          <p className="num text-sm font-semibold text-expense">{formatIDR(t.expense)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] text-muted">Sisa</p>
          <p className={`num text-sm font-semibold ${t.net >= 0 ? "text-income" : "text-expense"}`}>
            {formatIDR(t.net)}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden flex flex-col">
        {filtered.length ? (
          <>
            <TransactionList
              transactions={paginatedTransactions}
              categories={categories ?? []}
              wallets={wallets ?? []}
              onSelect={setEditing}
            />

            {totalPages > 1 && (
              <nav aria-label="pagination" className="flex w-full justify-center border-t border-border bg-surface px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Halaman sebelumnya"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>

                  {getPaginationRange(currentPage, totalPages).map((page, idx) => {
                    if (page === "ellipsis") {
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          className="flex h-8 w-8 items-center justify-center text-muted"
                        >
                          <MoreHorizontal className="size-4" />
                        </span>
                      );
                    }

                    const isCurrent = page === currentPage;
                    return (
                      <Button
                        key={page}
                        variant={isCurrent ? "primary" : "ghost"}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg text-xs"
                        onClick={() => setCurrentPage(page)}
                        aria-current={isCurrent ? "page" : undefined}
                      >
                        {page}
                      </Button>
                    );
                  })}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Halaman berikutnya"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </nav>
            )}
          </>
        ) : (
          <EmptyState
            icon={ListOrdered}
            title="Ga ada transaksi"
            description={
              activeFilters ? "Coba longgarkan filter." : "Belum ada catatan bulan ini."
            }
            action={
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus className="size-4" /> Catat transaksi
              </Button>
            }
          />
        )}
      </Card>

      <TransactionSheet open={adding} onClose={() => setAdding(false)} />
      <TransactionSheet
        open={Boolean(editing)}
        editing={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
