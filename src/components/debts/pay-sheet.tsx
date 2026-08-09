"use client";

import * as React from "react";
import { Button, Field, Input, Select, Sheet, useToast } from "@/components/ui";
import { payDebt } from "@/lib/repo";
import type { Debt } from "@/lib/types";
import { cn, formatIDR, parseAmount } from "@/lib/utils";

export function PaySheet({
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
  const remaining = debt ? Math.max(0, debt.amount - debt.paid_amount) : 0;
  const isPayable = debt?.type === "payable";
  const [amount, setAmount] = React.useState("");
  const [walletId, setWalletId] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setAmount(new Intl.NumberFormat("id-ID").format(remaining));
    setWalletId(debt?.wallet_id ?? wallets[0]?.id ?? "");
  }, [open, debt, remaining, wallets]);

  async function submit() {
    if (!debt) return;
    const value = parseAmount(amount);
    if (value <= 0) return;
    await payDebt(debt.id, value, walletId || undefined);
    toast(
      isPayable ? `Bayar utang ${debt.person} dicatat` : `Terima piutang dari ${debt.person} dicatat`,
      "success",
    );
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isPayable ? `Bayar utang ke ${debt?.person}` : `Terima piutang dari ${debt?.person}`}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button
            size="lg"
            className={cn("flex-1", isPayable ? "bg-expense text-expense-fg hover:brightness-110" : "")}
            onClick={submit}
            disabled={parseAmount(amount) <= 0}
          >
            {parseAmount(amount) >= remaining ? "Lunas" : isPayable ? "Bayar" : "Terima"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <div className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
          <div className="flex justify-between">
            <span>Total {isPayable ? "utang" : "piutang"}</span>
            <span className="num font-semibold text-fg">{formatIDR(debt?.amount ?? 0)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Sudah {isPayable ? "dibayar" : "diterima"}</span>
            <span className="num font-semibold text-fg">{formatIDR(debt?.paid_amount ?? 0)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-border pt-1 text-brand">
            <span>Sisa</span>
            <span className="num font-bold">{formatIDR(remaining)}</span>
          </div>
        </div>

        <Field label={isPayable ? "Nominal dibayar" : "Nominal diterima"}>
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

        <Field label="Dompet" hint="Transaksi otomatis dicatat ke dompet ini">
          <Select value={walletId} onChange={(e) => setWalletId(e.target.value)}>
            {wallets.length === 0 ? <option value="">Belum ada dompet</option> : null}
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Sheet>
  );
}
