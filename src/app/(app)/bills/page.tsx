"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BellRing, CalendarClock, Check, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { createBill, deleteBill, getSalaryForMonth, payBill, runBillReminderScan, updateBill, upsertSalary } from "@/lib/repo";
import { SalarySheet } from "@/components/bills/salary-sheet";
import type { Bill } from "@/lib/types";
import { cn, daysBetween, formatDate, formatIDR, parseAmount, toDateKey } from "@/lib/utils";
import { getSalarySummary } from "@/lib/bill-metrics";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  SegmentedControl,
  Sheet,
  Skeleton,
  useToast,
} from "@/components/ui";
import { StatTile } from "@/components/ui/stat-tile";

const REPEAT_LABEL: Record<Bill["repeat"], string> = {
  none: "Sekali",
  weekly: "Mingguan",
  monthly: "Bulanan",
  yearly: "Tahunan",
};

export default function BillsPage() {
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Bill | null>(null);
  const [salaryOpen, setSalaryOpen] = React.useState(false);
  const [hideBalance, setHideBalance] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<Bill | null>(null);
  const [payingId, setPayingId] = React.useState<string | null>(null);
  const [filterType, setFilterType] = React.useState<"all" | "regular" | "installment">("all");

  React.useEffect(() => {
    const val = localStorage.getItem("td.hideBalance") === "1";
    setHideBalance(val);
  }, []);

  const toggleHideBalance = () => {
    const next = !hideBalance;
    setHideBalance(next);
    localStorage.setItem("td.hideBalance", next ? "1" : "0");
  };

  const mask = (n: number) => (hideBalance ? "••••••" : n);

  const month = toDateKey().slice(0, 7);
  const salary = useLiveQuery(() => getSalaryForMonth(month), [month]);
  const bills = useLiveQuery(() => db().bills.filter((b) => !b.deleted).sortBy("due_date"), []);
  const wallets = useLiveQuery(
    () => db().wallets.filter((w) => !w.deleted && !w.archived).sortBy("order"),
    [],
  );
  const categories = useLiveQuery(
    () => db().categories.filter((c) => !c.deleted && c.type === "expense").toArray(),
    [],
  );

  const isLoading = bills === undefined || wallets === undefined || categories === undefined;

  const today = toDateKey();
  const active = (bills ?? []).filter((b) => !b.archived);
  const overdue = active.filter((b) => b.due_date < today);
  const dueSoon = active.filter((b) => {
    const d = daysBetween(today, b.due_date);
    return d >= 0 && d <= 7;
  });
  const monthlyTotal = active
    .filter((b) => b.repeat === "monthly")
    .reduce((a, b) => a + b.amount, 0);

  const totalActiveBills = active.reduce((a, b) => a + b.amount, 0);

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
  const salarySummary = getSalarySummary(salary?.amount, totalActiveBills);
  const remainingSalary = salarySummary.remaining;
  const salaryPercent = salarySummary.percent;

  const totalInstallmentDebt = active
    .filter((b) => b.is_installment)
    .reduce((acc, b) => {
      const remainingPayments = Math.max(0, (b.installment_total ?? 1) - (b.installment_paid ?? 0));
      const amountPerPeriod = b.installment_amount_per_period ?? b.amount;
      return acc + (remainingPayments * amountPerPeriod);
    }, 0);

  const monthlyInstallment = active
    .filter((b) => b.is_installment)
    .reduce((acc, b) => acc + b.amount, 0);

  const filteredBills = bills.filter((b) => {
    if (filterType === "regular") return !b.is_installment;
    if (filterType === "installment") return b.is_installment;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatTile label="Tagihan aktif" value={`${active.length}`} />
        <StatTile label="Bulanan" value={mask(monthlyTotal)} tone="expense" />
        <StatTile
          label="Gaji"
          value={salarySummary.configured ? mask(salary?.amount ?? 0) : "Belum diatur"}
          hint={
            <button
              onClick={toggleHideBalance}
              className="flex items-center gap-1 text-[10px] text-muted transition hover:text-fg"
            >
              {hideBalance ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
              {hideBalance ? "Tampilkan" : "Sembunyikan"}
            </button>
          }
        />
        <StatTile
          label="Sisa Gaji"
          value={remainingSalary == null ? "—" : mask(remainingSalary)}
          tone={remainingSalary == null ? "neutral" : remainingSalary >= 0 ? "income" : "expense"}
        />
        <StatTile
          label="Persentase"
          value={salaryPercent == null ? "—" : `${Math.round(salaryPercent)}%`}
          tone={salaryPercent == null ? "neutral" : salaryPercent > 100 ? "expense" : salaryPercent < 50 ? "income" : "brand"}
        />
        <StatTile label="Jatuh tempo ≤7 hari" value={`${dueSoon.length}`} tone="brand" />
      </div>

      {!salarySummary.configured && (
        <Card className="flex flex-col gap-3 rounded-2xl border-brand/20 bg-brand/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-semibold">Belum ada gaji yang keinput</h4>
            <p className="text-xs text-muted">Isi gaji bulanan dulu biar TrackingDuit bisa itung sisa duit kamu setelah bayar tagihan.</p>
          </div>
          <Button size="sm" onClick={() => setSalaryOpen(true)}>Set Gaji</Button>
        </Card>
      )}

      {salarySummary.configured && salaryPercent != null && salaryPercent > 100 && (
        <Card className="border-expense/20 bg-expense/10 p-3 text-xs font-medium text-expense">
          Duh, total tagihan sudah lebih gede dari gaji kamu bulan ini! ({Math.round(salaryPercent)}%)
        </Card>
      )}
      {salarySummary.configured && salaryPercent != null && salaryPercent >= 50 && salaryPercent <= 100 && (
        <Card className="border-warn/20 bg-warn/10 p-3 text-xs font-medium text-warn">
          Hati-hati, {Math.round(salaryPercent)}% gaji abis buat tagihan nih!
        </Card>
      )}
      {salarySummary.configured && salaryPercent != null && salaryPercent < 50 && (
        <Card className="border-income/20 bg-income/10 p-3 text-xs font-medium text-income">
          Mantap, tagihan cuma makan {Math.round(salaryPercent)}% gaji kamu bulan ini!
        </Card>
      )}

      {totalInstallmentDebt > 0 && (
        <Card className="border-brand/20 bg-brand/5 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h4 className="text-sm font-semibold text-brand">Ringkasan Sisa Cicilan</h4>
            <p className="text-xs text-muted mt-0.5">
              Kamu punya <span className="font-semibold text-fg">{active.filter(b => b.is_installment).length} cicilan aktif</span> dengan total sisa utang sebesar <span className="font-semibold text-expense">{formatIDR(totalInstallmentDebt)}</span>.
            </p>
          </div>
          <div className="flex flex-col text-right sm:items-end">
            <span className="text-[10px] text-muted">Beban Cicilan Bulan Ini</span>
            <span className="text-sm font-bold text-fg">{formatIDR(monthlyInstallment)}</span>
          </div>
        </Card>
      )}

      <div className="flex flex-row items-center gap-2 w-full sm:w-auto sm:justify-end">
        <Button 
          variant="outline" 
          className="text-[10px] sm:text-xs md:text-sm h-9 sm:h-10 px-2 sm:px-4 flex-1 sm:flex-none"
          onClick={() => setSalaryOpen(true)}
        >
          Set Gaji
        </Button>
        <Button
          variant="secondary"
          className="text-[10px] sm:text-xs md:text-sm h-9 sm:h-10 px-2 sm:px-4 flex-1 sm:flex-none"
          onClick={async () => {
            const n = await runBillReminderScan();
            toast(n ? `${n} pengingat dibuat` : "Belum ada pengingat baru", "success");
          }}
        >
          <BellRing className="size-3 sm:size-4 shrink-0" /> 
          <span className="truncate">Reminder</span>
        </Button>
        <Button
          className="text-[10px] sm:text-xs md:text-sm h-9 sm:h-10 px-2 sm:px-4 flex-1 sm:flex-none"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-3 sm:size-4 shrink-0" /> <span className="truncate">Tagihan</span>
        </Button>
      </div>

      {bills.length ? (
        <div className="space-y-4">
          <div className="flex justify-start">
            <SegmentedControl
              className="w-full sm:w-auto"
              value={filterType}
              onChange={setFilterType}
              options={[
                { value: "all", label: `Semua (${active.length})` },
                { value: "regular", label: `Tagihan rutin (${active.filter(b => !b.is_installment).length})` },
                { value: "installment", label: `Cicilan (${active.filter(b => b.is_installment).length})` },
              ]}
            />
          </div>

          {filteredBills.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {filteredBills.map((b) => {
                const days = daysBetween(today, b.due_date);
                const late = days < 0 && !b.archived;
            
            // Installment calculations
            const remainingPayments = b.is_installment 
              ? Math.max(0, (b.installment_total ?? 1) - (b.installment_paid ?? 0))
              : 0;
            const remainingAmount = remainingPayments * (b.installment_amount_per_period ?? b.amount);

            return (
              <Card key={b.id} className={cn("p-2.5 sm:p-4 flex flex-col justify-between relative", b.archived && "opacity-60")}>
                <div>
                  <div className="flex items-start justify-between gap-1 sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3">
                      <span
                        className={cn(
                          "hidden sm:grid size-7 sm:size-10 shrink-0 place-items-center rounded-full text-xs sm:text-base",
                          late ? "bg-expense/10 text-expense" : "bg-warn/10 text-warn",
                        )}
                      >
                        <CalendarClock className="size-3.5 sm:size-4.5" />
                      </span>
                      <div className="min-w-0 flex-1 pr-10 sm:pr-0">
                        <p className="text-xs sm:text-sm font-semibold leading-tight break-words line-clamp-2">{b.name}</p>
                        <p className="text-[9px] sm:text-[11px] text-muted truncate mt-0.5">
                          {formatDate(b.due_date)} {!b.is_installment && `· ${REPEAT_LABEL[b.repeat]}`}
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
                          setEditing(b);
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
                        onClick={() => setDeleteConfirm(b)}
                      >
                        <Trash2 className="size-3 sm:size-3.5 text-expense" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile-only absolute buttons at top right */}
                  <div className="absolute right-1 top-1.5 flex sm:hidden gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted hover:text-fg"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(b);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-3 lg:size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted hover:text-expense"
                      aria-label="Hapus"
                      onClick={() => setDeleteConfirm(b)}
                    >
                      <Trash2 className="size-3 text-expense" />
                    </Button>
                  </div>

                  {b.is_installment && (
                    <div className="mt-2 rounded-lg bg-surface-2 p-1.5 text-[9px] sm:text-[11px] text-muted space-y-0.5 border border-border/40">
                      <div className="flex justify-between font-medium">
                        <span>Cicilan ke-</span>
                        <span className="text-fg font-semibold">
                          {(b.installment_paid ?? 0)}/{b.installment_total ?? 1}x
                        </span>
                      </div>
                      {remainingPayments > 0 ? (
                        <>
                          <div className="flex justify-between">
                            <span>Sisa:</span>
                            <span className="text-fg font-medium">{remainingPayments}x lagi</span>
                          </div>
                          <div className="flex justify-between border-t border-border/40 pt-0.5 mt-0.5 text-brand">
                            <span>Utang:</span>
                            <span className="font-semibold">{formatIDR(remainingAmount)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-income font-medium pt-0.5">Lunas! 🎉</div>
                      )}
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between flex-wrap gap-1">
                    <span className="num text-xs sm:text-base font-bold truncate max-w-full">{formatIDR(b.amount)}</span>
                    <Badge 
                      className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0 shrink-0"
                      tone={b.archived ? "neutral" : late ? "expense" : days <= 3 ? "warn" : "brand"}
                    >
                      {b.archived
                        ? "Selesai"
                        : late
                          ? `Telat ${Math.abs(days)}h`
                          : days === 0
                            ? "Hari ini"
                            : `${days}h lagi`}
                    </Badge>
                  </div>
                </div>

                <div className="mt-2.5 w-full">
                  {!b.archived && !(b.is_installment && remainingPayments <= 0) ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-[10px] sm:text-xs h-7 sm:h-8 px-1.5"
                      loading={payingId === b.id}
                      disabled={payingId !== null}
                      onClick={async () => {
                        if (payingId) return;
                        setPayingId(b.id);
                        try {
                          await payBill(b.id);
                          toast(`${b.name} ditandai lunas`, "success");
                        } catch {
                          toast("Pembayaran tagihan gagal dicatat", "error");
                        } finally {
                          setPayingId(null);
                        }
                      }}
                    >
                      <Check className="size-3 shrink-0 mr-0.5" /> <span className="truncate">Lunas{b.auto_create_tx ? " + catat" : ""}</span>
                    </Button>
                  ) : null}
                </div>
              </Card>
            );
          })}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted">
              Tidak ada data yang cocok dengan filter.
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={CalendarClock}
            title="Belum ada tagihan"
            description="Catat listrik, internet, cicilan, atau langganan supaya tidak terlambat bayar."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="size-4" /> Tambah tagihan
              </Button>
            }
          />
        </Card>
      )}

      <BillSheet
        open={open}
        bill={editing}
        wallets={wallets}
        categories={categories}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      />
      <SalarySheet
        open={salaryOpen}
        onClose={() => setSalaryOpen(false)}
        month={month}
        initialAmount={salary?.amount}
      />

      {/* Delete Confirmation Modal */}
      <Sheet
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Hapus Tagihan"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Yakin ingin menghapus tagihan <strong>{deleteConfirm?.name}</strong>?
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
                await deleteBill(deleteConfirm.id);
                toast("Tagihan berhasil dihapus", "success");
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

// Simplified Sheet to avoid complex state management in this Edit

function BillSheet({
  open,
  bill,
  wallets,
  categories,
  onClose,
}: {
  open: boolean;
  bill: Bill | null;
  wallets: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [dueDate, setDueDate] = React.useState(toDateKey());
  const [repeat, setRepeat] = React.useState<Bill["repeat"]>("monthly");
  const [reminderDays, setReminderDays] = React.useState("3");
  const [walletId, setWalletId] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [autoTx, setAutoTx] = React.useState(true);
  
  // Installment states
  const [isInstallment, setIsInstallment] = React.useState(false);
  const [instalmentTotal, setInstalmentTotal] = React.useState("12");
  const [instalmentPaid, setInstalmentPaid] = React.useState("0");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(bill?.name ?? "");
    setAmount(bill ? new Intl.NumberFormat("id-ID").format(bill.amount) : "");
    setDueDate(bill?.due_date ?? toDateKey());
    setRepeat(bill?.repeat ?? "monthly");
    setReminderDays(String(bill?.reminder_days ?? 3));
    setWalletId(bill?.wallet_id ?? wallets[0]?.id ?? "");
    setCategoryId(bill?.category_id ?? "");
    setAutoTx(bill ? Boolean(bill.auto_create_tx) : true);
    setIsInstallment(bill ? Boolean(bill.is_installment) : false);
    setInstalmentTotal(String(bill?.installment_total ?? "12"));
    setInstalmentPaid(String(bill?.installment_paid ?? "0"));
  }, [open, bill, wallets]);

  async function save() {
    if (saving) return;
    const value = parseAmount(amount);
    if (!name.trim() || value <= 0) return;
    const totalPeriods = Number(instalmentTotal) || 1;
    const payload = {
      name: name.trim(),
      amount: value,
      due_date: dueDate,
      repeat: isInstallment ? "monthly" : repeat,
      reminder_days: Number(reminderDays) || 0,
      wallet_id: walletId || undefined,
      category_id: categoryId || undefined,
      auto_create_tx: (autoTx ? 1 : 0) as 0 | 1,
      is_installment: (isInstallment ? 1 : 0) as 0 | 1,
      installment_total: isInstallment ? totalPeriods : undefined,
      installment_paid: isInstallment ? (Number(instalmentPaid) || 0) : undefined,
      installment_amount_per_period: isInstallment ? value : undefined,
    };
    setSaving(true);
    try {
      if (bill) {
        await updateBill(bill.id, payload);
        toast("Tagihan diperbarui", "success");
      } else {
        await createBill({ ...payload, archived: 0 });
        toast("Tagihan ditambahkan", "success");
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
      title={bill ? "Edit Tagihan" : "Tagihan Baru"}
      footer={
        <Button className="w-full" size="lg" onClick={save} loading={saving} disabled={saving || !name.trim() || !amount}>
          Simpan
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Nama tagihan">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="cth. Listrik PLN"
          />
        </Field>

        <Field label="Tipe Tagihan">
          <SegmentedControl
            className="w-full"
            value={isInstallment ? "installment" : "regular"}
            onChange={(v) => setIsInstallment(v === "installment")}
            options={[
              { value: "regular", label: "Tagihan rutin" },
              { value: "installment", label: "Cicilan" },
            ]}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={isInstallment ? "Nominal per bulan" : "Nominal"}>
            <Input
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                const formatted = digits ? new Intl.NumberFormat("id-ID").format(Number(digits)) : "";
                setAmount(formatted);
              }}
              placeholder="0"
            />
          </Field>
          <Field label={isInstallment ? "Mulai bayar" : "Jatuh tempo"}>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>

          {isInstallment ? (
            <>
              <Field label="Tenor (Bulan)">
                <Input
                  inputMode="numeric"
                  value={instalmentTotal}
                  onChange={(e) => setInstalmentTotal(e.target.value.replace(/\D/g, ""))}
                  placeholder="12"
                />
              </Field>
              <Field label="Sudah dibayar (kali)">
                <Input
                  inputMode="numeric"
                  value={instalmentPaid}
                  onChange={(e) => setInstalmentPaid(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                />
              </Field>
            </>
          ) : (
            <Field label="Pengulangan">
              <Select value={repeat} onChange={(e) => setRepeat(e.target.value as Bill["repeat"])}>
                {Object.entries(REPEAT_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Ingatkan (hari sebelum)">
            <Input
              inputMode="numeric"
              value={reminderDays}
              onChange={(e) => setReminderDays(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <Field label="Dompet pembayar">
            <Select value={walletId} onChange={(e) => setWalletId(e.target.value)}>
              <option value="">-</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Kategori">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">-</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
          <input
            type="checkbox"
            checked={autoTx}
            onChange={(e) => setAutoTx(e.target.checked)}
            className="size-4 accent-[var(--brand)]"
          />
          <span className="text-xs">
            Buat transaksi pengeluaran otomatis saat ditandai lunas
          </span>
        </label>
      </div>
    </Sheet>
  );
}
