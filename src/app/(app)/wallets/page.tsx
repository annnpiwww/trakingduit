"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  Wallet as WalletIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  adjustWalletBalance,
  allWalletBalances,
  createWallet,
  deleteWallet,
  updateWallet,
} from "@/lib/repo";
import { WALLET_COLORS, WALLET_TYPE_LABEL } from "@/lib/seed";
import type { Wallet, WalletType } from "@/lib/types";
import { cn, formatIDR, parseAmount } from "@/lib/utils";
import {
  BalanceCard,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Sheet,
  Skeleton,
  useToast,
} from "@/components/ui";
import { DynIcon, ICON_NAMES } from "@/components/ui/icon";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem, getAnimation } from "@/lib/animations";
export default function WalletsPage() {
  const toast = useToast();
  const [editing, setEditing] = React.useState<Wallet | null>(null);
  const [open, setOpen] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<Wallet | null>(null);
  const [adjustWallet, setAdjustWallet] = React.useState<Wallet | null>(null);

  const wallets = useLiveQuery(() => db().wallets.filter((w) => !w.deleted).sortBy("order"), []);
  const balances = useLiveQuery(
    async () => {
      await db().transactions.count();
      await db().wallets.count();
      return allWalletBalances();
    },
    [],
  );
  const txCounts = useLiveQuery(
    async () => {
      const txs = await db().transactions.filter((t) => !t.deleted).toArray();
      const map: Record<string, number> = {};
      for (const t of txs) {
        map[t.wallet_id] = (map[t.wallet_id] ?? 0) + 1;
        if (t.to_wallet_id) map[t.to_wallet_id] = (map[t.to_wallet_id] ?? 0) + 1;
      }
      return map;
    },
    [],
  );

  const isLoading = wallets === undefined || balances === undefined;
  const active = (wallets ?? []).filter((w) => !w.archived);
  const archived = (wallets ?? []).filter((w) => w.archived);
  const total = active.reduce((a, w) => a + ((balances ?? {})[w.id] ?? 0), 0);
  const deleteTxCount = deleteConfirm ? (txCounts ?? {})[deleteConfirm.id] ?? 0 : 0;

  async function toggleArchive(w: Wallet) {
    await updateWallet(w.id, { archived: w.archived ? 0 : 1 });
    toast(w.archived ? "Dompet diaktifkan" : "Dompet diarsipkan", "success");
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
        <Skeleton className="h-36 w-full rounded-3xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">Dompet</h1>
          <p className="text-xs text-muted">Kelola saldo tiap akun</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Tambah Dompet
        </Button>
      </div>

      <BalanceCard
        label="Total saldo gabungan"
        value={formatIDR(total)}
        sub={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span>{active.length} dompet aktif</span>
            <button
              type="button"
              onClick={() => setAdjustWallet(null)}
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-white/25"
            >
              <SlidersHorizontal className="size-3" /> Atur Saldo Real
            </button>
          </span>
        }
      />

      {active.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((w) => (
            <WalletCard
              key={w.id}
              wallet={w}
              balance={balances[w.id] ?? 0}
              txCount={(txCounts ?? {})[w.id] ?? 0}
              onEdit={() => {
                setEditing(w);
                setOpen(true);
              }}
              onArchive={() => toggleArchive(w)}
              onDelete={() => setDeleteConfirm(w)}
              onAdjust={() => setAdjustWallet(w)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={WalletIcon}
            title="Belum ada dompet"
            description="Tambah dompet tunai, rekening bank, atau e-wallet."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="size-4" /> Tambah dompet
              </Button>
            }
          />
        </Card>
      )}

      {archived.length ? (
        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold tracking-tight text-muted">Diarsip</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((w) => (
              <WalletCard
                key={w.id}
                wallet={w}
                balance={balances[w.id] ?? 0}
                txCount={(txCounts ?? {})[w.id] ?? 0}
                onEdit={() => {
                  setEditing(w);
                  setOpen(true);
                }}
                onArchive={() => toggleArchive(w)}
                onDelete={() => setDeleteConfirm(w)}
                onAdjust={() => setAdjustWallet(w)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <WalletSheet
        open={open}
        wallet={editing}
        walletCount={wallets?.length ?? 0}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      />

      <AdjustBalanceSheet
        open={adjustWallet !== null}
        wallet={adjustWallet}
        wallets={active}
        balances={balances ?? {}}
        onClose={() => setAdjustWallet(null)}
      />

      {/* Delete Confirmation Modal */}
      <Sheet
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Hapus Dompet"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {deleteTxCount > 0
              ? `Yakin mau hapus dompet ${deleteConfirm?.name}? Ada riwayat ${deleteTxCount} transaksi, lho!`
              : `Yakin mau hapus dompet ${deleteConfirm?.name}?`}
          </p>
          <div className="flex flex-col gap-2">
            {deleteTxCount > 0 ? (
              <>
                <Button
                  variant="danger"
                  size="lg"
                  className="w-full"
                  onClick={async () => {
                    if (!deleteConfirm) return;
                    const res = await deleteWallet(deleteConfirm.id, { cascade: true });
                    toast(`Dompet dan ${res.txCount} transaksinya dihapus`, "success");
                    setDeleteConfirm(null);
                  }}
                >
                  Hapus Beserta {deleteTxCount} Transaksinya
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={async () => {
                    if (!deleteConfirm) return;
                    await updateWallet(deleteConfirm.id, { archived: 1 });
                    toast("Dompet diarsipkan, riwayat aman", "success");
                    setDeleteConfirm(null);
                  }}
                >
                  Arsipkan Saja
                </Button>
              </>
            ) : (
              <Button
                variant="danger"
                size="lg"
                className="w-full"
                onClick={async () => {
                  if (!deleteConfirm) return;
                  await deleteWallet(deleteConfirm.id);
                  toast("Dompet dihapus", "success");
                  setDeleteConfirm(null);
                }}
              >
                Hapus
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setDeleteConfirm(null)}
            >
              Batal
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function WalletCard({
  wallet,
  balance,
  txCount,
  onEdit,
  onArchive,
  onDelete,
  onAdjust,
}: {
  wallet: Wallet;
  balance: number;
  txCount: number;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onAdjust: () => void;
}) {
  return (
    <div>
      <Card
        className={cn("relative overflow-hidden p-4 text-white", wallet.archived && "opacity-60")}
        style={{ background: `linear-gradient(135deg, ${wallet.color}, ${wallet.color}cc)` }}
      >
      <div className="flex items-start justify-between">
        <span className="grid size-11 place-items-center rounded-full bg-white/15 text-white">
          <DynIcon name={wallet.icon} className="size-5" />
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onAdjust}
            aria-label="Atur saldo real"
            className="text-white hover:bg-white/15 hover:text-white"
          >
            <SlidersHorizontal className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            aria-label="Edit dompet"
            className="text-white hover:bg-white/15 hover:text-white"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onArchive}
            aria-label={wallet.archived ? "Aktifin" : "Arsip"}
            className="text-white hover:bg-white/15 hover:text-white"
          >
            {wallet.archived ? (
              <ArchiveRestore className="size-3.5" />
            ) : (
              <Archive className="size-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label="Hapus dompet"
            className="text-white hover:bg-white/15 hover:text-white"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      <p className="mt-3 truncate text-sm font-medium text-white">{wallet.name}</p>
      <p className={cn("num mt-0.5 text-xl font-semibold", balance < 0 && "text-white/70")}>
        {formatIDR(balance)}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium text-white">
          {WALLET_TYPE_LABEL[wallet.type]}
        </span>
        <span className="text-[11px] text-white/80">{txCount} transaksi</span>
      </div>
    </Card>
    </div>
  );
}

function WalletSheet({
  open,
  wallet,
  walletCount,
  onClose,
}: {
  open: boolean;
  wallet: Wallet | null;
  walletCount: number;
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<WalletType>("cash");
  const [initial, setInitial] = React.useState("");
  const [color, setColor] = React.useState(WALLET_COLORS[0]);
  const [icon, setIcon] = React.useState("wallet");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(wallet?.name ?? "");
    setType(wallet?.type ?? "cash");
    setInitial(wallet ? new Intl.NumberFormat("id-ID").format(wallet.initial_balance) : "");
    setColor(wallet?.color ?? WALLET_COLORS[0]);
    setIcon(wallet?.icon ?? "wallet");
  }, [open, wallet]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        initial_balance: parseAmount(initial),
        currency: "IDR",
        color,
        icon,
      };
      if (wallet) {
        await updateWallet(wallet.id, payload);
        toast("Dompet diperbarui", "success");
      } else {
        await createWallet({ ...payload, archived: 0, order: walletCount });
        toast("Dompet ditambahkan", "success");
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!wallet) return;
    const res = await deleteWallet(wallet.id);
    toast(
      res.archived
        ? `Dompet punya ${res.txCount} transaksi - diarsipkan, bukan dihapus`
        : "Dompet dihapus",
      "success",
    );
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={wallet ? "Ubah Dompet" : "Dompet Baru"}
      footer={
        <div className="flex gap-2">
          {wallet ? (
            <Button variant="outline" size="lg" onClick={remove}>
              Hapus
            </Button>
          ) : null}
          <Button className="flex-1" size="lg" onClick={save} disabled={!name.trim()} loading={saving}>
            Simpan
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Nama dompet">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="cth. BCA, GoPay, Dompet Tunai"
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jenis">
            <Select value={type} onChange={(e) => setType(e.target.value as WalletType)}>
              {Object.entries(WALLET_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Saldo awal" hint="Saldo sebelum pencatatan dimulai">
            <Input
              inputMode="numeric"
              value={initial}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                const formatted = digits ? new Intl.NumberFormat("id-ID").format(Number(digits)) : "";
                setInitial(formatted);
              }}
              placeholder="0"
            />
          </Field>
        </div>

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

function AdjustBalanceSheet({
  open,
  wallet,
  wallets,
  balances,
  onClose,
}: {
  open: boolean;
  /** Wallet yang disetel; `null` → pilih dari dropdown (dipakai dari BalanceCard). */
  wallet: Wallet | null;
  wallets: Wallet[];
  balances: Record<string, number>;
  onClose: () => void;
}) {
  const toast = useToast();
  const [walletId, setWalletId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setWalletId(wallet?.id ?? wallets[0]?.id ?? "");
    setAmount("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const target = wallets.find((w) => w.id === walletId) ?? null;

  async function save() {
    if (!target) return;
    const value = parseAmount(amount);
    setSaving(true);
    try {
      await adjustWalletBalance(target.id, value);
      toast(`Saldo dompet disesuaikan ke ${formatIDR(value)}`, "success");
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Atur Saldo Real"
      description="Samakan saldo dompet dengan uang yang benar-benar ada"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={onClose}>
            Batal
          </Button>
          <Button className="flex-1" size="lg" onClick={save} disabled={!target} loading={saving}>
            Simpan
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {!wallet ? (
          <Field label="Dompet">
            <Select value={walletId} onChange={(e) => setWalletId(e.target.value)}>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Saldo real sekarang" hint="Ketik nominal uang yang benar-benar ada">
          <Input
            inputMode="numeric"
            value={amount}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              const formatted = digits ? new Intl.NumberFormat("id-ID").format(Number(digits)) : "";
              setAmount(formatted);
            }}
            placeholder="cth. 539.564"
            autoFocus
          />
        </Field>
        {target ? (
          <p className="text-xs text-muted">
            Saldo tercatat:{" "}
            <span className="num font-medium text-fg">{formatIDR(balances[target.id] ?? 0)}</span>
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
