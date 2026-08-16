"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { createBudget, deleteBudget, updateBudget } from "@/lib/repo";
import type { Budget } from "@/lib/types";
import { formatIDR, monthRange, parseAmount, pct, toDateKey, toMonthKey } from "@/lib/utils";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Progress,
  Select,
  Sheet,
  Skeleton,
  useToast,
} from "@/components/ui";
import { DynIcon } from "@/components/ui/icon";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { StatTile } from "@/components/ui/stat-tile";

export default function BudgetsPage() {
  const toast = useToast();
  const [month, setMonth] = React.useState(toMonthKey());
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Budget | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<Budget | null>(null);

  const categories = useLiveQuery(
    () => db().categories.filter((c) => !c.deleted && c.type === "expense").toArray(),
    [],
  );
  const budgets = useLiveQuery(
    () => db().budgets.filter((b) => !b.deleted && b.start_date.startsWith(month)).toArray(),
    [month],
  );
  const monthTx = useLiveQuery(
    () => {
      const { from, to } = monthRange(month);
      return db()
        .transactions.where("date")
        .between(from, to, true, true)
        .filter((t) => !t.deleted && t.type === "expense")
        .toArray();
    },
    [month],
  );

  const isLoading = budgets === undefined || monthTx === undefined || categories === undefined;

  const spentBy = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of monthTx ?? []) {
      if (!t.category_id) continue;
      map[t.category_id] = (map[t.category_id] ?? 0) + t.amount;
    }
    return map;
  }, [monthTx]);

  const totalBudget = (budgets ?? []).reduce((a, b) => a + b.amount, 0);
  const totalSpent = (budgets ?? []).reduce((a, b) => a + (spentBy[b.category_id] ?? 0), 0);
  const daysLeft = React.useMemo(() => {
    const { to } = monthRange(month);
    const today = toDateKey();
    const daysInMonth = Number(to.slice(-2));
    if (today > to) return 0;
    if (today < `${month}-01`) return daysInMonth;
    return daysInMonth - Number(today.slice(-2)) + 1;
  }, [month]);

  const unbudgeted = (categories ?? []).filter((c) => !(budgets ?? []).some((b) => b.category_id === c.id));

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthSwitcher value={month} onChange={setMonth} />
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          disabled={!unbudgeted.length && !budgets.length}
        >
          <Plus className="size-4" /> Budget
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total budget" value={totalBudget} />
        <StatTile label="Kepake" value={totalSpent} tone="expense" />
        <StatTile
          label="Sisa"
          value={Math.max(0, totalBudget - totalSpent)}
          tone={totalSpent > totalBudget ? "expense" : "income"}
        />
        <StatTile
          label="Hari tersisa"
          value={`${daysLeft} hari`}
          hint={
            daysLeft && totalBudget - totalSpent > 0
              ? `${formatIDR((totalBudget - totalSpent) / daysLeft)}/hari`
              : undefined
          }
        />
      </div>

      {budgets.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {budgets.map((b) => {
            const cat = categories.find((c) => c.id === b.category_id);
            const spent = spentBy[b.category_id] ?? 0;
            const ratio = pct(spent, b.amount);
            const remaining = b.amount - spent;
            return (
              <Card key={b.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-10 place-items-center rounded-full"
                      style={{ background: `${cat?.color ?? "#94a3b8"}1f`, color: cat?.color }}
                    >
                      <DynIcon name={cat?.icon} className="size-4.5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{cat?.name ?? "Kategori"}</p>
                      <p className="text-[11px] text-muted">
                        {b.period === "monthly" ? "Bulanan" : "Mingguan"}
                      </p>
                    </div>
                  </div>
                  <div className="flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(b);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Hapus"
                      onClick={() => setDeleteConfirm(b)}
                    >
                      <Trash2 className="size-3.5 text-expense" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="num text-lg font-semibold">{formatIDR(spent)}</span>
                    <span className="num text-xs text-muted">dari {formatIDR(b.amount)}</span>
                  </div>
                  <Progress value={ratio} tone={ratio >= 100 ? "expense" : ratio >= 80 ? "warn" : "brand"} />
                  <p className="mt-1.5 text-[11px] text-muted">
                    {remaining >= 0
                      ? `Sisa ${formatIDR(remaining)} · ${ratio}% terpakai`
                      : `Lewat ${formatIDR(-remaining)} dari budget`}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={CreditCard}
            title="Belum ada budget bulan ini"
            description="Set batas keluar per kategori."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="size-4" /> Buat budget
              </Button>
            }
          />
        </Card>
      )}

      <BudgetSheet
        open={open}
        budget={editing}
        month={month}
        categories={categories}
        usedCategoryIds={budgets.map((b) => b.category_id)}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <Sheet
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Hapus Budget"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Yakin ingin menghapus budget untuk kategori <strong>{categories.find((c) => c.id === deleteConfirm?.category_id)?.name}</strong>?
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
                await deleteBudget(deleteConfirm.id);
                toast("Budget berhasil dihapus", "success");
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

function BudgetSheet({
  open,
  budget,
  month,
  categories,
  usedCategoryIds,
  onClose,
}: {
  open: boolean;
  budget: Budget | null;
  month: string;
  categories: { id: string; name: string }[];
  usedCategoryIds: string[];
  onClose: () => void;
}) {
  const toast = useToast();
  const [categoryId, setCategoryId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [period, setPeriod] = React.useState<Budget["period"]>("monthly");
  const [saving, setSaving] = React.useState(false);

  const available = categories.filter(
    (c) => c.id === budget?.category_id || !usedCategoryIds.includes(c.id),
  );

  React.useEffect(() => {
    if (!open) return;
    setCategoryId(budget?.category_id ?? available[0]?.id ?? "");
    setAmount(budget ? new Intl.NumberFormat("id-ID").format(budget.amount) : "");
    setPeriod(budget?.period ?? "monthly");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, budget]);

  async function save() {
    if (saving) return;
    const value = parseAmount(amount);
    if (!categoryId || value <= 0) return;
    setSaving(true);
    try {
      if (budget) {
        await updateBudget(budget.id, { amount: value, period, category_id: categoryId });
        toast("Budget diperbarui", "success");
      } else {
        await createBudget({
          category_id: categoryId,
          amount: value,
          period,
          start_date: `${month}-01`,
          rollover: 0,
        });
        toast("Budget dibuat", "success");
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={budget ? "Ubah Budget" : "Budget Baru"}
      description={`Periode ${month}`}
      footer={
        <Button className="w-full" size="lg" onClick={save} loading={saving} disabled={saving || !categoryId || !amount}>
          Simpan
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Kategori">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Batas pengeluaran">
          <Input
            inputMode="numeric"
            value={amount}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              const formatted = digits ? new Intl.NumberFormat("id-ID").format(Number(digits)) : "";
              setAmount(formatted);
            }}
            placeholder="cth. 1.500.000"
          />
        </Field>
        <Field label="Periode">
          <Select value={period} onChange={(e) => setPeriod(e.target.value as Budget["period"])}>
            <option value="monthly">Bulanan</option>
            <option value="weekly">Mingguan</option>
          </Select>
        </Field>
      </div>
    </Sheet>
  );
}
