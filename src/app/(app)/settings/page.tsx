"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Check,
  ChevronRight,
  CloudUpload,
  Crown,
  Database,
  FileSpreadsheet,
  FileUp,
  Lock,
  LockKeyhole,
  LogOut,
  Palette,
  Plus,
  RefreshCcwDot,
  Save,
  SunMoon,
  Tags,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { db, resetAll } from "@/lib/db";
import { createCategory, deleteCategory } from "@/lib/repo";
import { useSession } from "@/lib/session";
import { useSubscription } from "@/lib/subscription";
import { useTheme, type Accent } from "@/lib/theme";
import { lastSheetSync, syncGoogleSheet } from "@/lib/sync/sheets";
import { lastSupabaseSync, syncSupabase } from "@/lib/sync/supabase-sync";
import { useAutoSync, type AutoSyncState } from "@/lib/sync/auto-sync";
import {
  commitImport,
  exportBackup,
  importBackup,
  previewCSV,
  type ImportPreview,
} from "@/lib/import";
import { WALLET_COLORS } from "@/lib/seed";
import { cn, downloadFile, formatDate, formatIDR, hashPin } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Select,
  SegmentedControl,
  Sheet,
  useToast,
} from "@/components/ui";
import { DynIcon } from "@/components/ui/icon";

const AUTO_SYNC_BADGE: Record<
  AutoSyncState,
  { label: string; tone: React.ComponentProps<typeof Badge>["tone"] }
> = {
  disabled: { label: "Belum diset", tone: "neutral" },
  local: { label: "Mode offline", tone: "warn" },
  idle: { label: "Udah sync", tone: "brand" },
  syncing: { label: "Lagi sync...", tone: "brand" },
  offline: { label: "Offline", tone: "warn" },
  error: { label: "Gagal sync", tone: "expense" },
};

/** Tema warna premium — swatch light/dark mengikuti palette di globals.css. */
const ACCENT_OPTIONS: { id: Accent; name: string; light: string; dark: string }[] = [
  { id: "default", name: "Biru", light: "#0060af", dark: "#3b9bff" },
  { id: "violet", name: "Ungu", light: "#7c3aed", dark: "#a78bfa" },
  { id: "ocean", name: "Laut", light: "#0f766e", dark: "#2dd4bf" },
  { id: "sunset", name: "Senja", light: "#c2410c", dark: "#fb923c" },
  { id: "rose", name: "Mawar", light: "#db2777", dark: "#f472b6" },
  { id: "forest", name: "Hutan", light: "#15803d", dark: "#4ade80" },
];

export default function SettingsPage() {
  const toast = useToast();
  const { profile, updateProfile, signOut, supabaseEnabled, lock } = useSession();
  const { tier } = useSubscription();
  const { theme, setTheme, accent, setAccent } = useTheme();
  const isPro = tier === "pro";

  // Tema warna premium cuma buat Pro — kalau tier turun, balikin ke default.
  React.useEffect(() => {
    if (!isPro && accent !== "default") setAccent("default");
  }, [isPro, accent, setAccent]);

  const [name, setName] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [syncing, setSyncing] = React.useState<"sheet" | "supabase" | null>(null);
  const [sheetStatus, setSheetStatus] = React.useState<
    { connected: boolean; title?: string; tab?: string; error?: string } | null
  >(null);
  const [sheetSyncedAt, setSheetSyncedAt] = React.useState<string | null>(null);
  const [supabaseSyncedAt, setSupabaseSyncedAt] = React.useState<string | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [confirmReset, setConfirmReset] = React.useState(false);
  const backupInput = React.useRef<HTMLInputElement>(null);

  const autoSync = useAutoSync();
  /** Auto-sync lebih baru daripada state lokal halaman ini, jadi dia yang menang. */
  const syncedAt = autoSync.lastAt ?? supabaseSyncedAt;

  const logs = useLiveQuery(() => db().syncLogs.reverse().limit(8).toArray(), [], []);
  const counts = useLiveQuery(async () => {
    const d = db();
    const [transactions, wallets, receipts, categories] = await Promise.all([
      d.transactions.filter((t) => !t.deleted).count(),
      d.wallets.filter((w) => !w.deleted).count(),
      d.receipts.filter((r) => !r.deleted).count(),
      d.categories.filter((c) => !c.deleted).count(),
    ]);
    return { transactions, wallets, receipts, categories };
  }, [], { transactions: 0, wallets: 0, receipts: 0, categories: 0 });

  React.useEffect(() => {
    setName(profile?.name ?? "");
    setDisplayName(profile?.display_name ?? "");
  }, [profile]);

  React.useEffect(() => {
    void (async () => {
      setSheetSyncedAt(await lastSheetSync());
      setSupabaseSyncedAt(await lastSupabaseSync());
      try {
        const res = await fetch("/api/sync/google-sheet");
        setSheetStatus(await res.json());
      } catch {
        setSheetStatus({ connected: false, error: "Tidak bisa menghubungi server" });
      }
    })();
  }, []);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const cleanDisplayName = displayName.trim();
      if (cleanDisplayName && (cleanDisplayName.length < 3 || cleanDisplayName.length > 30)) {
        throw new Error("Nama tampilan harus 3-30 karakter");
      }
      const patch: Parameters<typeof updateProfile>[0] = { 
        name: name.trim() || "Pengguna",
        display_name: cleanDisplayName || undefined,
      };
      if (pin) {
        if (!/^\d{6}$/.test(pin)) throw new Error("PIN harus 6 digit angka");
        patch.pin_hash = await hashPin(pin);
      }
      await updateProfile(patch);
      setPin("");
      toast("Profil disimpan", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menyimpan", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function removePin() {
    try {
      await updateProfile({ pin_hash: undefined });
      toast("PIN dihapus", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menghapus PIN", "error");
    }
  }

  async function runSheetSync() {
    setSyncing("sheet");
    try {
      const res = await syncGoogleSheet();
      setSheetSyncedAt(res.at);
      toast(`Spreadsheet: ${res.pushed} dikirim, ${res.pulled} diterima`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Sinkron gagal", "error");
    } finally {
      setSyncing(null);
    }
  }

  async function runSupabaseSync() {
    setSyncing("supabase");
    try {
      const res = await syncSupabase();
      setSupabaseSyncedAt(res.at);
      toast(`Supabase: ${res.pushed} dikirim, ${res.pulled} diterima`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Sinkron gagal", "error");
    } finally {
      setSyncing(null);
    }
  }

  async function downloadBackup() {
    if (tier === "free") {
      toast("Unduh backup buat member Premium. Upgrade di Menu > Premium", "error");
      return;
    }
    const json = await exportBackup();
    downloadFile(`trackingduit-backup-${new Date().toISOString().slice(0, 10)}.json`, json, "application/json");
    toast("Backup diunduh", "success");
  }

  async function restoreBackup(file: File) {
    try {
      const restored = await importBackup(await file.text());
      toast(`${restored} baris dipulihkan`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Restore gagal", "error");
    }
  }

  return (
    <div className="space-y-4">
      {/* Profile */}
      <Card>
        <CardHeader title="Profil" subtitle={profile?.email ?? "Mode offline"} />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Nama">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field 
            label="Nama Tampilan" 
            hint="Nama lengkap yang ditampilkan di dashboard (3-30 karakter)"
          >
            <Input 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)} 
              placeholder="Kosongkan untuk pakai Nama"
            />
          </Field>
          <Field
            label="PIN 6 digit"
            hint={profile?.pin_hash ? "PIN aktif. Isi untuk mengganti." : "Kosong = tanpa kunci."}
          >
            <Input
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="······"
            />
          </Field>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button onClick={saveProfile} loading={savingProfile}>
              <Save className="size-4" /> Simpan
            </Button>
            {profile?.pin_hash ? (
              <>
                <Button variant="secondary" onClick={lock}>
                  <LockKeyhole className="size-4" /> Kunci sekarang
                </Button>
                <Button variant="ghost" onClick={removePin}>
                  Hapus PIN
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader title="Tampilan" subtitle="Tema aplikasi" />
        <div className="p-4">
          <SegmentedControl
            value={theme}
            onChange={setTheme}
            options={[
              { value: "dark", label: "Gelap" },
              { value: "light", label: "Terang" },
            ]}
          />
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <SunMoon className="size-3.5" />
            Preferensi disimpan di perangkat ini.
          </p>

          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2.5 flex items-center gap-1.5 text-sm font-medium">
              <Palette className="size-4 text-brand" />
              Tema warna premium
              {!isPro ? (
                <Badge tone="warn">
                  <Crown className="size-3" /> Pro
                </Badge>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-3">
              {ACCENT_OPTIONS.map((a) => {
                const locked = !isPro && a.id !== "default";
                const selected = accent === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    disabled={locked}
                    aria-label={`Tema ${a.name}${locked ? " (khusus Pro)" : ""}`}
                    onClick={() => setAccent(a.id)}
                    className={cn(
                      "group flex flex-col items-center gap-1.5",
                      locked && "cursor-not-allowed",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-11 place-items-center rounded-full border-2 transition-all",
                        selected
                          ? "scale-110 border-fg shadow-sm ring-2 ring-brand/30"
                          : "border-transparent hover:scale-105",
                        locked && "opacity-40",
                      )}
                      style={{ background: `linear-gradient(135deg, ${a.light}, ${a.dark})` }}
                    >
                      {locked ? (
                        <Lock className="size-4 text-white/90" />
                      ) : selected ? (
                        <Check className="size-4 text-white drop-shadow" />
                      ) : null}
                    </span>
                    <span className="text-[10px] text-muted">{a.name}</span>
                  </button>
                );
              })}
            </div>
            {!isPro ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <Crown className="size-3.5 text-warn" />
                Khusus member Pro. Upgrade di{" "}
                <Link href="/premium" className="font-medium text-brand underline-offset-2 hover:underline">
                  Menu › Premium
                </Link>
                .
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Sync */}
      <Card>
        <CardHeader title="Sinkronisasi" subtitle="Spreadsheet & cloud" />
        <div className="divide-y divide-border">
          <div className="flex flex-wrap items-center gap-3 p-4">
            <span className="grid size-10 place-items-center rounded-full bg-income/10 text-income">
              <FileSpreadsheet className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                Google Spreadsheet
                <Badge tone={sheetStatus?.connected ? "income" : "neutral"}>
                  {sheetStatus?.connected ? "Terhubung" : "Belum diset"}
                </Badge>
              </p>
              <p className="mt-0.5 truncate text-xs text-muted">
                {sheetStatus?.connected
                  ? `${sheetStatus.title} · tab ${sheetStatus.tab}${
                      sheetSyncedAt ? ` · terakhir ${formatDate(sheetSyncedAt)}` : ""
                    }`
                  : (sheetStatus?.error ?? "Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID")}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={runSheetSync}
              loading={syncing === "sheet"}
              disabled={!sheetStatus?.connected}
            >
              <RefreshCcwDot className="size-4" /> Sinkron
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 p-4">
            <span className="grid size-10 place-items-center rounded-full bg-brand/10 text-brand">
              <CloudUpload className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                Supabase
                <Badge tone={AUTO_SYNC_BADGE[autoSync.state].tone}>
                  {AUTO_SYNC_BADGE[autoSync.state].label}
                </Badge>
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {!supabaseEnabled
                  ? "Set NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY"
                  : autoSync.state === "error"
                    ? (autoSync.error ?? "Sinkron gagal, mencoba lagi otomatis")
                    : autoSync.state === "local"
                      ? "Login lewat Akun Cloud supaya data tersimpan di server"
                      : syncedAt
                        ? `Sinkron otomatis tiap menit · terakhir ${formatDate(syncedAt)}`
                        : "Sinkron otomatis aktif · belum pernah sinkron"}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={runSupabaseSync}
              loading={syncing === "supabase"}
              disabled={!supabaseEnabled}
            >
              <RefreshCcwDot className="size-4" /> Sinkron
            </Button>
          </div>
        </div>

        {logs.length ? (
          <div className="border-t border-border px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted">Log sinkronisasi</p>
            <ul className="space-y-1 text-[11px]">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      l.status === "success" ? "bg-income" : "bg-expense",
                    )}
                  />
                  <span className="text-muted">{formatDate(l.at)}</span>
                  <span className="truncate">
                    {l.target === "google-sheet" ? "Spreadsheet" : "Supabase"} - {l.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      {/* Data */}
      <Card>
        <CardHeader
          title="Data"
          subtitle={`${counts.transactions} transaksi · ${counts.wallets} dompet · ${counts.receipts} nota · ${counts.categories} kategori`}
        />
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <FileUp className="size-4" /> Impor mutasi CSV
          </Button>
          <Button variant="secondary" onClick={() => setCategoryOpen(true)}>
            <Tags className="size-4" /> Kelola kategori
          </Button>
          <Button variant="secondary" onClick={downloadBackup}>
            <Database className="size-4" /> Unduh backup JSON
          </Button>
          <Button variant="secondary" onClick={() => backupInput.current?.click()}>
            <Upload className="size-4" /> Pulihkan backup
          </Button>
          <input
            ref={backupInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && restoreBackup(e.target.files[0])}
          />
        </div>
      </Card>

      {/* Danger zone */}
      <Card>
        <CardHeader title="Zona berbahaya" subtitle="Aksi berikut tidak bisa dibatalkan" />
        <div className="space-y-2 p-4">
          {confirmReset ? (
            <div className="rounded-xl border border-expense/40 bg-expense/10 p-3">
              <p className="flex items-start gap-2 text-xs text-expense">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                Semua transaksi, dompet, budget, target, tagihan, dan nota di perangkat ini akan
                dihapus permanen. Backup dulu kalau belum.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    try {
                      await resetAll();
                      setConfirmReset(false);
                      toast("Data direset", "success");
                    } catch (err) {
                      toast(err instanceof Error ? err.message : "Gagal reset data", "error");
                    }
                  }}
                >
                  Ya, hapus semua
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setConfirmReset(true)}>
              <Trash2 className="size-4" /> Reset semua data
            </Button>
          )}
          <Button variant="ghost" onClick={() => signOut()}>
            <LogOut className="size-4" /> Keluar akun
          </Button>
        </div>
      </Card>

      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} />
      <CategorySheet open={categoryOpen} onClose={() => setCategoryOpen(false)} />
    </div>
  );
}

/* -------------------------------- CSV import ------------------------------- */

function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<ImportPreview | null>(null);
  const [walletId, setWalletId] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const wallets = useLiveQuery(
    () => db().wallets.filter((w) => !w.deleted && !w.archived).sortBy("order"),
    [],
    [],
  );

  React.useEffect(() => {
    if (!open) setPreview(null);
  }, [open]);

  React.useEffect(() => {
    if (!walletId && wallets.length) setWalletId(wallets[0].id);
  }, [wallets, walletId]);

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      const result = previewCSV(text);
      if (!result.rows.length) {
        toast("Tidak ada baris yang bisa dibaca dari file itu", "error");
        return;
      }
      setPreview(result);
    } catch {
      toast("Gagal membaca file", "error");
    }
  }

  async function commit() {
    if (!preview || !walletId) return;
    setBusy(true);
    try {
      const res = await commitImport(preview.rows, walletId);
      toast(
        `${res.imported} transaksi diimpor${res.duplicates ? `, ${res.duplicates} duplikat dilewati` : ""}`,
        "success",
      );
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Impor gagal", "error");
    } finally {
      setBusy(false);
    }
  }

  const selected = preview?.rows.filter((r) => r.include) ?? [];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Impor mutasi CSV"
      description="Untuk bank/e-wallet tanpa API resmi"
      size="lg"
      footer={
        preview ? (
          <Button className="w-full" size="lg" onClick={commit} loading={busy} disabled={!selected.length}>
            Impor {selected.length} transaksi
          </Button>
        ) : undefined
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {!preview ? (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Unduh mutasi rekening dalam format CSV dari internet banking, lalu unggah di sini. Kolom
            tanggal, keterangan, dan debit/kredit dideteksi otomatis.
          </p>
          <Button className="w-full" onClick={() => fileRef.current?.click()}>
            <FileUp className="size-4" /> Pilih file CSV
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Masuk ke dompet">
              <Select value={walletId} onChange={(e) => setWalletId(e.target.value)}>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end">
              <p className="text-xs text-muted">
                {preview.rows.length} baris terbaca
                {preview.skipped ? `, ${preview.skipped} dilewati` : ""}. Hilangkan centang untuk
                melewati baris.
              </p>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-2 text-muted">
                <tr>
                  <th className="w-8 px-2 py-2"></th>
                  <th className="px-2 py-2 text-left font-medium">Tanggal</th>
                  <th className="px-2 py-2 text-left font-medium">Keterangan</th>
                  <th className="px-2 py-2 text-right font-medium">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.rows.map((row, i) => (
                  <tr key={i} className={cn(!row.include && "opacity-40")}>
                    <td className="px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={row.include}
                        onChange={(e) =>
                          setPreview((p) =>
                            p
                              ? {
                                  ...p,
                                  rows: p.rows.map((r, idx) =>
                                    idx === i ? { ...r, include: e.target.checked } : r,
                                  ),
                                }
                              : p,
                          )
                        }
                        className="size-3.5 accent-[var(--brand)]"
                      />
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{row.date}</td>
                    <td className="max-w-40 truncate px-2 py-1.5">{row.description}</td>
                    <td
                      className={cn(
                        "num px-2 py-1.5 text-right whitespace-nowrap",
                        row.type === "income" ? "text-income" : "text-expense",
                      )}
                    >
                      {row.type === "income" ? "+" : "−"}
                      {formatIDR(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ------------------------------- categories -------------------------------- */

function CategorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"expense" | "income">("expense");

  const categories = useLiveQuery(() => db().categories.filter((c) => !c.deleted).toArray(), [], []);

  async function add() {
    const clean = name.trim();
    if (!clean) return;
    const dup = categories.some(
      (c) => !c.deleted && c.type === type && c.name.toLowerCase() === clean.toLowerCase(),
    );
    if (dup) {
      toast("Kategori itu udah ada", "error");
      return;
    }
    await createCategory({
      name: clean,
      type,
      icon: "ellipsis",
      color: WALLET_COLORS[categories.length % WALLET_COLORS.length],
      is_default: 0,
      active: 1,
      keywords: [clean.toLowerCase()],
    });
    setName("");
    toast("Kategori ditambahkan", "success");
  }

  return (
    <Sheet open={open} onClose={onClose} title="Kelola Kategori" size="lg">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama kategori baru"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as "expense" | "income")}
            className="w-32"
          >
            <option value="expense">Keluar</option>
            <option value="income">Masuk</option>
          </Select>
          <Button onClick={add} aria-label="Tambah kategori">
            <Plus className="size-4" />
          </Button>
        </div>

        {(["expense", "income"] as const).map((group) => (
          <div key={group}>
            <p className="mb-2 text-xs font-medium text-muted">
              {group === "expense" ? "Keluar" : "Masuk"}
            </p>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {categories
                .filter((c) => c.type === group)
                .map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                    <span
                      className="grid size-8 place-items-center rounded-full"
                      style={{ background: `${c.color}1f`, color: c.color }}
                    >
                      <DynIcon name={c.icon} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                    {c.is_default ? <Badge>Default</Badge> : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Hapus kategori"
                      onClick={async () => {
                        await deleteCategory(c.id);
                        toast("Kategori dihapus", "success");
                      }}
                    >
                      <Trash2 className="size-3.5 text-expense" />
                    </Button>
                  </li>
                ))}
            </ul>
          </div>
        ))}

        <p className="text-xs text-muted">
          Menghapus kategori tidak menghapus transaksinya - transaksi lama akan tampil sebagai
          &quot;Tanpa kategori&quot;.
        </p>
      </div>
    </Sheet>
  );
}
