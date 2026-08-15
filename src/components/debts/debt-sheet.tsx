"use client";

import * as React from "react";
import { Button, Field, Input, SegmentedControl, Select, Sheet, Textarea, useToast } from "@/components/ui";
import { createDebt, updateDebt } from "@/lib/repo";
import type { Debt } from "@/lib/types";
import { cn, parseAmount } from "@/lib/utils";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-left"
    >
      <span className="text-xs font-medium text-fg">{label}</span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-5",
          )}
        />
      </span>
    </button>
  );
}

export function DebtSheet({
  open,
  debt,
  wallets,
  onClose,
}: {
  open: boolean;
  debt: Debt | null;
  wallets: { id: string; name: string }[];
  onClose: () => void;
}) {
  const toast = useToast();
  const [person, setPerson] = React.useState("");
  const [type, setType] = React.useState<Debt["type"]>("receivable");
  const [amount, setAmount] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [walletId, setWalletId] = React.useState("");
  const [autoTx, setAutoTx] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    setPerson(debt?.person ?? "");
    setType(debt?.type ?? "receivable");
    setAmount(debt ? new Intl.NumberFormat("id-ID").format(debt.amount) : "");
    setDueDate(debt?.due_date ?? "");
    setNote(debt?.note ?? "");
    setWalletId(debt?.wallet_id ?? wallets[0]?.id ?? "");
    setAutoTx(debt ? Boolean(debt.auto_tx) : true);
  }, [open, debt, wallets]);

  async function save() {
    const value = parseAmount(amount);
    if (!person.trim() || value <= 0) return;
    const payload = {
      person: person.trim(),
      type,
      amount: value,
      paid_amount: debt?.paid_amount ?? 0,
      due_date: dueDate || undefined,
      note: note.trim() || undefined,
      wallet_id: walletId || undefined,
      auto_tx: (autoTx ? 1 : 0) as 0 | 1,
    };
    if (debt) {
      await updateDebt(debt.id, payload);
      toast("Utang piutang diupdate", "success");
    } else {
      await createDebt(payload);
      toast("Catatan utang piutang dibuat", "success");
    }
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={debt ? "Edit Catatan" : "Catat Utang Piutang"}
      description="Utang = uang yang kamu pinjam, piutang = uang yang dipinjam orang dari kamu"
      footer={
        <Button className="w-full" size="lg" onClick={save} disabled={!person.trim() || parseAmount(amount) <= 0}>
          Simpan
        </Button>
      }
    >
      <div className="space-y-4 pt-1">
        <SegmentedControl
          className="w-full"
          value={type}
          onChange={setType}
          options={[
            { value: "receivable", label: "Piutang (ditagih)" },
            { value: "payable", label: "Utang (dibayar)" },
          ]}
        />

        <Field label="Nama orang" hint="Siapa yang berutang atau siapa yang kamu pinjami">
          <Input
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            placeholder="cth. Andi, Warung Bu Sari, Rani"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nominal">
            <Input
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setAmount(digits ? new Intl.NumberFormat("id-ID").format(Number(digits)) : "");
              }}
              placeholder="0"
            />
          </Field>
          <Field label="Jatuh tempo (opsional)">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Catatan (opsional)">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contoh: sisa patungan, sudah janji bayar bulan depan"
            rows={2}
          />
        </Field>

        <Field label="Dompet" hint="Dipakai saat transaksi otomatis diaktifkan">
          <Select value={walletId} onChange={(e) => setWalletId(e.target.value)}>
            {wallets.length === 0 ? <option value="">Belum ada dompet</option> : null}
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </Field>

        <Toggle
          checked={autoTx}
          onChange={setAutoTx}
          label="Otomatis dicatat sebagai transaksi saat dibayar atau diterima"
        />
      </div>
    </Sheet>
  );
}
