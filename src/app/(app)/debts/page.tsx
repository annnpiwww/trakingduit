"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CalendarClock, HandCoins, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteDebt } from "@/lib/repo";
import type { Debt } from "@/lib/types";
import { cn, daysBetween, formatDate, formatIDR, toDateKey } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Progress,
  SegmentedControl,
  Sheet,
  Skeleton,
  useToast,
} from "@/components/ui";
import { StatTile } from "@/components/ui/stat-tile";
import { DebtSheet } from "@/components/debts/debt-sheet";
import { PaySheet } from "@/components/debts/pay-sheet";

export default function DebtsPage() {
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Debt | null>(null);
  const [paying, setPaying] = React.useState<Debt | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<Debt | null>(null);
  const [filter, setFilter] = React.useState<"all" | "receivable" | "payable">("all");

  const debts = useLiveQuery(() => db().debts.filter((d) => !d.deleted).sortBy("created_at"), []);
  const wallets = useLiveQuery(
    () => db().wallets.filter((w) => !w.deleted && !w.archived).sortBy("order"),
    [],
  );

  const isLoading = debts === undefined || wallets === undefined;

  const all = debts ?? [];
  const active = all.filter((d) => d.paid_amount < d.amount);
  const receivable = active.filter((d) => d.type === "receivable");
  const payable = active.filter((d) => d.type === "payable");
  const receivableTotal = receivable.reduce((a, d) => a + (d.amount - d.paid_amount), 0);
  const payableTotal = payable.reduce((a, d) => a + (d.amount - d.paid_amount), 0);
  const settledCount = all.filter((d) => d.paid_amount >= d.amount).length;

  const today = toDateKey();
  const dueSoon = active.filter((d) => {
    if (!d.due_date) return false;
    const diff = daysBetween(today, d.due_date);
    return diff >= 0 && diff <= 7;
  });
  const overdue = active.filter((d) => d.due_date && d.due_date < today);

  const filtered = all.filter((d) => {
    if (filter === "receivable") return d.type === "receivable";
    if (filter === "payable") return d.type === "payable";
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Piutang (ditagih)" value={receivableTotal} tone="income" />
        <StatTile label="Utang (dibayar)" value={payableTotal} tone="expense" />
        <StatTile
          label="Bersih"
          value={receivableTotal - payableTotal}
          tone={receivableTotal >= payableTotal ? "income" : "expense"}
        />
        <StatTile label="Jatuh tempo ≤7 hari" value={`${dueSoon.length}`} tone="brand" />
      </div>

      {overdue.length > 0 && (
        <Card className="flex items-center gap-3 border-expense/20 bg-expense/10 p-3 text-xs font-medium text-expense">
          <CalendarClock className="size-4 shrink-0" />
          {overdue.length} catatan lewat jatuh tempo — buruan beresin!
        </Card>
      )}

      <div className="flex flex-row items-center gap-2 sm:justify-end">
        <Button
          className="text-[10px] sm:text-xs md:text-sm h-9 sm:h-10 px-2 sm:px-4 flex-1 sm:flex-none"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-3 sm:size-4 shrink-0" /> <span className="truncate">Utang Piutang</span>
        </Button>
      </div>

      {all.length ? (
        <div className="space-y-4">
          <div className="flex justify-start">
            <SegmentedControl
              className="w-full sm:w-auto"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: `Semua (${active.length})` },
                { value: "receivable", label: `Piutang (${receivable.length})` },
                { value: "payable", label: `Utang (${payable.length})` },
              ]}
            />
          </div>

          {filtered.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {filtered.map((d) => {
                const isPayable = d.type === "payable";
                const remaining = Math.max(0, d.amount - d.paid_amount);
                const pct = Math.round((d.paid_amount / d.amount) * 100);
                const settled = remaining <= 0;
                const late = Boolean(d.due_date && d.due_date < today && !settled);
                const days = d.due_date ? daysBetween(today, d.due_date) : null;

                return (
                  <Card
                    key={d.id}
                    className={cn(
                      "relative flex flex-col justify-between p-2.5 sm:p-4",
                      settled && "opacity-60",
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 sm:gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3">
                          <span
                            className={cn(
                              "hidden sm:grid size-7 sm:size-10 shrink-0 place-items-center rounded-full text-sm sm:text-base",
                              isPayable ? "bg-expense/10 text-expense" : "bg-income/10 text-income",
                            )}
                          >
                            <HandCoins className="size-3.5 sm:size-4.5" />
                          </span>
                          <div className="min-w-0 flex-1 pr-10 sm:pr-0">
                            <p className="text-xs sm:text-sm font-semibold leading-tight break-words line-clamp-2">
                              {d.person}
                            </p>
                            <p className="mt-0.5 text-[9px] sm:text-[11px] text-muted truncate">
                              {d.due_date
                                ? `Jatuh tempo ${formatDate(d.due_date)}`
                                : d.note || (isPayable ? "Utang" : "Piutang")}
                            </p>
                          </div>
                        </div>
                        <div className="hidden sm:flex shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 sm:size-9"
                            aria-label="Edit"
                            onClick={() => {
                              setEditing(d);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="size-3 sm:size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 sm:size-9"
                            aria-label="Hapus"
                            onClick={() => setDeleteConfirm(d)}
                          >
                            <Trash2 className="size-3 sm:size-3.5 text-expense" />
                          </Button>
                        </div>
                      </div>

                      <div className="absolute right-1 top-1.5 flex sm:hidden gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted hover:text-fg"
                          aria-label="Edit"
                          onClick={() => {
                            setEditing(d);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted hover:text-expense"
                          aria-label="Hapus"
                          onClick={() => setDeleteConfirm(d)}
                        >
                          <Trash2 className="size-3 text-expense" />
                        </Button>
                      </div>

                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="num text-xs sm:text-base font-bold truncate">
                            {formatIDR(remaining)}
                          </span>
                          <Badge
                            className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0 shrink-0"
                            tone={settled ? "income" : late ? "expense" : isPayable ? "expense" : "income"}
                          >
                            {settled ? "Lunas" : late ? "Telat" : days === 0 ? "Hari ini" : `${days} hari lagi`}
                          </Badge>
                        </div>
                        <Progress
                          value={pct}
                          tone={settled ? "income" : isPayable ? "expense" : "income"}
                          className="h-1.5"
                        />
                        <p className="text-[9px] sm:text-[10px] text-muted">
                          {d.paid_amount > 0
                            ? `${formatIDR(d.paid_amount)} dari ${formatIDR(d.amount)}`
                            : `Total ${formatIDR(d.amount)}`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 w-full">
                      {!settled ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className={cn(
                            "w-full text-[10px] sm:text-xs h-7 sm:h-8 px-1.5",
                            isPayable
                              ? "border-expense/30 bg-expense/10 text-expense hover:bg-expense/15"
                              : "border-income/30 bg-income/10 text-income hover:bg-income/15",
                          )}
                          onClick={() => setPaying(d)}
                        >
                          <HandCoins className="size-3 shrink-0 mr-0.5" />
                          <span className="truncate">{isPayable ? "Bayar" : "Terima"}</span>
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted">Tidak ada data yang cocok dengan filter.</Card>
          )}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={HandCoins}
            title="Belum ada catatan utang-piutang"
            description="Catat siapa yang meminjam uang dari kamu atau siapa yang kamu pinjami, biar nggak lupa menagih."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="size-4" /> Catat sekarang
              </Button>
            }
          />
        </Card>
      )}

      {settledCount > 0 && all.length > 0 ? (
        <p className="text-center text-xs text-muted">
          {settledCount} catatan lunas disimpan di daftar ini.
        </p>
      ) : null}

      <DebtSheet
        open={open}
        debt={editing}
        wallets={wallets ?? []}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      />

      <PaySheet
        open={Boolean(paying)}
        debt={paying}
        wallets={wallets ?? []}
        onClose={() => setPaying(null)}
      />

      <Sheet open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} title="Hapus Catatan">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Yakin ingin menghapus catatan utang piutang dengan <strong>{deleteConfirm?.person}</strong>?
            <br />
            <span className="text-xs">
              Riwayat transaksi yang sudah tercatat tetap aman.
            </span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="lg" className="flex-1" onClick={() => setDeleteConfirm(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              onClick={async () => {
                if (!deleteConfirm) return;
                await deleteDebt(deleteConfirm.id);
                toast("Catatan berhasil dihapus", "success");
                setDeleteConfirm(null);
              }}
            >
              Hapus
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
