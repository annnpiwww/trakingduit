"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Minus, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { contributeToGoal, createGoal, deleteGoal, updateGoal } from "@/lib/repo";
import { WALLET_COLORS } from "@/lib/seed";
import type { SavingGoal } from "@/lib/types";
import { cn, daysBetween, formatIDR, parseAmount, pct, toDateKey } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Progress,
  Sheet,
  Skeleton,
  useToast,
} from "@/components/ui";
import { DynIcon, ICON_NAMES } from "@/components/ui/icon";
import { StatTile } from "@/components/ui/stat-tile";

export default function GoalsPage() {
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SavingGoal | null>(null);
  const [contributing, setContributing] = React.useState<SavingGoal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<SavingGoal | null>(null);

  const goals = useLiveQuery(() => db().goals.filter((g) => !g.deleted).toArray(), []);
  const isLoading = goals === undefined;
  const active = (goals ?? []).filter((g) => !g.archived);
  const totalTarget = active.reduce((a, g) => a + g.target_amount, 0);
  const totalSaved = active.reduce((a, g) => a + g.saved_amount, 0);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-9 w-32 rounded-full" />
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
        <StatTile label="Total target" value={totalTarget} />
        <StatTile label="Sudah terkumpul" value={totalSaved} tone="income" />
        <StatTile label="Kurang" value={Math.max(0, totalTarget - totalSaved)} tone="expense" />
        <StatTile
          label="Progress"
          value={`${pct(totalSaved, totalTarget)}%`}
          tone="brand"
          hint={`${active.length} target aktif`}
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Target Baru
        </Button>
      </div>

      {goals.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => {
            const ratio = pct(g.saved_amount, g.target_amount);
            const done = g.saved_amount >= g.target_amount;
            const daysLeft = g.deadline ? daysBetween(toDateKey(), g.deadline) : undefined;
            const perMonth =
              daysLeft && daysLeft > 0 && !done
                ? ((g.target_amount - g.saved_amount) / daysLeft) * 30
                : 0;
            return (
              <Card key={g.id} className={cn("p-4", g.archived && "opacity-60")}>
                <div className="flex items-start justify-between">
                  <span
                    className="grid size-10 place-items-center rounded-full"
                    style={{ background: `${g.color}1f`, color: g.color }}
                  >
                    <DynIcon name={g.icon} className="size-4.5" />
                  </span>
                  <div className="flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(g);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Hapus"
                      onClick={() => setDeleteConfirm(g)}
                    >
                      <Trash2 className="size-3.5 text-expense" />
                    </Button>
                  </div>
                </div>

                <p className="mt-3 truncate text-sm font-medium">{g.name}</p>
                <p className="num mt-0.5 text-lg font-semibold">
                  {formatIDR(g.saved_amount)}
                  <span className="text-xs font-normal text-muted"> / {formatIDR(g.target_amount)}</span>
                </p>

                <Progress className="mt-2" value={ratio} tone={done ? "income" : "brand"} />

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                  <Badge tone={done ? "income" : "brand"}>{ratio}%</Badge>
                  {g.deadline ? (
                    <span>
                      {daysLeft && daysLeft > 0
                        ? `${daysLeft} hari lagi`
                        : daysLeft === 0
                          ? "Deadline hari ini"
                          : "Sudah lewat deadline"}
                    </span>
                  ) : null}
                  {perMonth > 0 ? <span>· menabung {formatIDR(perMonth)}/bulan</span> : null}
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setContributing(g)}
                  >
                    <Plus className="size-3.5" /> Setor
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateGoal(g.id, { archived: g.archived ? 0 : 1 })}
                  >
                    {g.archived ? "Aktifin" : "Arsip"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Target}
            title="Belum ada target tabungan"
            description="Buat target seperti dana darurat, liburan, atau uang muka rumah."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="size-4" /> Target baru
              </Button>
            }
          />
        </Card>
      )}

      <GoalSheet
        open={open}
        goal={editing}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      />
      <ContributeSheet goal={contributing} onClose={() => setContributing(null)} />

      {/* Delete Confirmation Modal */}
      <Sheet
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Hapus Target Tabungan"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Yakin ingin menghapus target tabungan <strong>{deleteConfirm?.name}</strong>?
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
                await deleteGoal(deleteConfirm.id);
                toast("Target berhasil dihapus", "success");
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

function GoalSheet({
  open,
  goal,
  onClose,
}: {
  open: boolean;
  goal: SavingGoal | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [saved, setSaved] = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const [color, setColor] = React.useState(WALLET_COLORS[0]);
  const [icon, setIcon] = React.useState("target");

  React.useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? "");
    setTarget(goal ? new Intl.NumberFormat("id-ID").format(goal.target_amount) : "");
    setSaved(goal ? new Intl.NumberFormat("id-ID").format(goal.saved_amount) : "");
    setDeadline(goal?.deadline ?? "");
    setColor(goal?.color ?? WALLET_COLORS[0]);
    setIcon(goal?.icon ?? "target");
  }, [open, goal]);

  async function save() {
    const targetValue = parseAmount(target);
    if (!name.trim() || targetValue <= 0) return;
    const payload = {
      name: name.trim(),
      target_amount: targetValue,
      saved_amount: parseAmount(saved),
      deadline: deadline || undefined,
      color,
      icon,
    };
    if (goal) {
      await updateGoal(goal.id, payload);
      toast("Target diperbarui", "success");
    } else {
      await createGoal({ ...payload, archived: 0 });
      toast("Target dibuat", "success");
    }
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={goal ? "Edit Target" : "Target Baru"}
      footer={
        <Button className="w-full" size="lg" onClick={save} disabled={!name.trim() || !target}>
          Simpan
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Nama target">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="cth. Dana Darurat"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nominal target">
            <Input
              inputMode="numeric"
              value={target}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                const formatted = digits ? new Intl.NumberFormat("id-ID").format(Number(digits)) : "";
                setTarget(formatted);
              }}
              placeholder="10.000.000"
            />
          </Field>
          <Field label="Sudah terkumpul">
            <Input
              inputMode="numeric"
              value={saved}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                const formatted = digits ? new Intl.NumberFormat("id-ID").format(Number(digits)) : "";
                setSaved(formatted);
              }}
              placeholder="0"
            />
          </Field>
        </div>
        <Field label="Deadline" hint="Opsional">
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
        <Field label="Warna">
          <div className="flex flex-wrap gap-2">
            {WALLET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Warna ${c}`}
                className={cn(
                  "size-8 rounded-lg border-2 transition",
                  color === c ? "border-fg scale-110" : "border-transparent",
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>
        <Field label="Ikon">
          <div className="grid grid-cols-8 gap-2">
            {ICON_NAMES.map((n) => (
              <button
                key={n}
                onClick={() => setIcon(n)}
                aria-label={n}
                className={cn(
                  "grid aspect-square place-items-center rounded-lg border transition",
                  icon === n ? "border-brand bg-brand/10 text-brand" : "border-border text-muted",
                )}
              >
                <DynIcon name={n} className="size-4" />
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Sheet>
  );
}

function ContributeSheet({ goal, onClose }: { goal: SavingGoal | null; onClose: () => void }) {
  const toast = useToast();
  const [amount, setAmount] = React.useState("");
  const [mode, setMode] = React.useState<1 | -1>(1);

  React.useEffect(() => {
    if (goal) {
      setAmount("");
      setMode(1);
    }
  }, [goal]);

  async function submit() {
    if (!goal) return;
    const value = parseAmount(amount);
    if (value <= 0) return;
    await contributeToGoal(goal.id, value * mode);
    toast(mode === 1 ? `Setor ${formatIDR(value)}` : `Tarik ${formatIDR(value)}`, "success");
    onClose();
  }

  return (
    <Sheet
      open={Boolean(goal)}
      onClose={onClose}
      title={goal?.name ?? ""}
      description={goal ? `Terkumpul ${formatIDR(goal.saved_amount)} dari ${formatIDR(goal.target_amount)}` : ""}
      footer={
        <Button className="w-full" size="lg" onClick={submit} disabled={!amount}>
          {mode === 1 ? "Setor" : "Tarik"}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={mode === 1 ? "primary" : "secondary"}
            className="flex-1"
            onClick={() => setMode(1)}
          >
            <Plus className="size-4" /> Setor
          </Button>
          <Button
            variant={mode === -1 ? "primary" : "secondary"}
            className="flex-1"
            onClick={() => setMode(-1)}
          >
            <Minus className="size-4" /> Tarik
          </Button>
        </div>
        <Field label="Nominal">
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
        <p className="text-xs text-muted">
          Setoran hanya memperbarui progres target. Untuk memindahkan uang antar dompet, catat
          transaksi bertipe Transfer.
        </p>
      </div>
    </Sheet>
  );
}
