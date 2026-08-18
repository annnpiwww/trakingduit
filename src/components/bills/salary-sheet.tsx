"use client";
import * as React from "react";
import { Button, Field, Input, Sheet } from "@/components/ui/index";
import { upsertSalary } from "@/lib/repo";

interface SalarySheetProps {
  open: boolean;
  onClose: () => void;
  month: string;
  initialAmount?: number;
}

export function SalarySheet({ open, onClose, month, initialAmount }: SalarySheetProps) {
  const [amount, setAmount] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setAmount(initialAmount ? new Intl.NumberFormat("id-ID").format(initialAmount) : "");
  }, [open, initialAmount]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Set Gaji Bulanan"
      footer={
        <Button
          className="w-full"
          size="lg"
          loading={saving}
          disabled={saving || !amount}
          onClick={async () => {
            if (saving) return;
            setSaving(true);
            try {
              await upsertSalary(month, Number(amount.replace(/\D/g, "")));
              onClose();
            } finally {
              setSaving(false);
            }
          }}
        >
          Simpan
        </Button>
      }
    >
      <Field label="Gaji Bulanan">
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
    </Sheet>
  );
}
