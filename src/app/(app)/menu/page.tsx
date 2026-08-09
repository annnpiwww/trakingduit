"use client";

import Link from "next/link";
import * as React from "react";
import {
  CalendarClock,
  ChartPie,
  ChevronRight,
  CreditCard,
  HandCoins,
  LogOut,
  MonitorSmartphone,
  ScanLine,
  Settings,
  Target,
  Wallet,
} from "lucide-react";
import { useSession } from "@/lib/session";
import { Button, Card, Field, Input, Sheet, useToast } from "@/components/ui";
import { InstallSheet } from "@/components/install/install-sheet";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/scan", label: "Scan Nota", desc: "Foto struk, auto-catat jadi transaksi", icon: ScanLine },
  { href: "/wallets", label: "Dompet", desc: "Atur dompet, bank, & e-wallet kamu", icon: Wallet },
  { href: "/debts", label: "Utang Piutang", desc: "Catat utang & piutang, biar nggak lupa nagih", icon: HandCoins },
  { href: "/budgets", label: "Budget", desc: "Set budget, biar gak boncos", icon: CreditCard },
  { href: "/goals", label: "Target Nabung", desc: "Pantau progres menabung", icon: Target },
  { href: "/bills", label: "Tagihan & Cicilan", desc: "Pengingat jatuh tempo", icon: CalendarClock },
  { href: "/analytics", label: "Analisis", desc: "Cek tren pengeluaran kamu", icon: ChartPie },
  { href: "/settings", label: "Pengaturan", desc: "Sinkron, data, tema, PIN", icon: Settings },
];

export default function MenuPage() {
  const { profile, signOut } = useSession();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [installOpen, setInstallOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      <Card 
        className="flex items-center gap-3 p-4 cursor-pointer transition hover:bg-surface-2"
        onClick={() => setProfileOpen(true)}
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.name}
            className="size-12 rounded-2xl object-cover border border-border"
          />
        ) : (
          <span
            className="grid size-12 place-items-center rounded-2xl text-lg font-semibold text-white"
            style={{ background: profile?.avatar_color ?? "#0f9d76" }}
          >
            {(profile?.name ?? "?").slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{profile?.name}</p>
          <p className="truncate text-xs text-muted">{profile?.email ?? "Mode lokal"}</p>
        </div>
        <ChevronRight className="size-4 text-muted shrink-0" />
      </Card>

      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          {ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2"
              >
                <span className="grid size-9 place-items-center rounded-full bg-brand/10 text-brand">
                  <item.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-muted">{item.desc}</span>
                </span>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            </li>
          ))}
          <li>
            <button
              onClick={() => setInstallOpen(true)}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2"
            >
              <span className="grid size-9 place-items-center rounded-full bg-accent/10 text-accent">
                <MonitorSmartphone className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Install Aplikasi</span>
                <span className="block text-xs text-muted">Pasang TrackingDuit di home screen</span>
              </span>
              <ChevronRight className="size-4 text-muted" />
            </button>
          </li>
        </ul>
      </Card>

      <Button variant="outline" className="w-full" onClick={() => signOut()}>
        <LogOut className="size-4" /> Keluar
      </Button>

      <p className="text-center text-xs text-muted">
        TrackingDuit v1.14.0
      </p>

      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      <InstallSheet open={installOpen} onClose={() => setInstallOpen(false)} />
    </div>
  );
}

function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const { profile, updateProfile } = useSession();
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("#0f9d76");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open && profile) {
      setName(profile.name);
      setColor(profile.avatar_color);
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [open, profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 5MB!");
      return;
    }

    // Kompres ke max 512px JPEG supaya data URL-nya kecil: lebih ringan buat
    // IndexedDB, dan nggak melewati batas payload PostgREST saat sync ke cloud.
    // createImageBitmap + imageOrientation buat hormatin EXIF (foto HP), dan
    // resizeWidth dulu biar nggak decode gambar raksasa penuh (bisa crash Safari).
    const bitmapPromise = createImageBitmap(file, {
      imageOrientation: "from-image",
      resizeWidth: 512,
      resizeHeight: 512,
      resizeQuality: "high",
    }).catch(() => null);
    void bitmapPromise.then((bitmap) => {
      if (!bitmap) return;
      const MAX = 512;
      const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // JPEG nggak punya alpha — isi putih dulu biar PNG transparan nggak jadi hitam.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      setAvatarUrl(canvas.toDataURL("image/jpeg", 0.85));
      bitmap.close();
    });
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await updateProfile({
        name: name.trim(),
        avatar_color: color,
        avatar_url: avatarUrl || undefined,
      });
      toast("Profil disimpan", "success");
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menyimpan profil", "error");
    }
  };

  const colors = ["#0f9d76", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#10b981", "#6b7280"];

  return (
    <Sheet 
      open={open} 
      onClose={onClose} 
      title="Edit Profil" 
      footer={
        <Button className="w-full" size="lg" onClick={handleSave} disabled={!name.trim()}>
          Simpan
        </Button>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Avatar Photo Preview */}
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Preview" className="size-20 rounded-2xl object-cover border border-border" />
            ) : (
              <div 
                className="grid size-20 place-items-center rounded-2xl text-2xl font-bold text-white shadow-sm"
                style={{ background: color }}
              >
                {(name || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <div className="flex gap-2 mt-1">
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              Pilih Foto
            </Button>
            {avatarUrl && (
              <Button size="sm" variant="ghost" className="text-expense hover:bg-expense/10" onClick={() => setAvatarUrl("")}>
                Hapus Foto
              </Button>
            )}
          </div>
        </div>

        <Field label="Nama Lengkap">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masukkan nama..." />
        </Field>

        <Field label="Warna Profil (tanpa foto)">
          <div className="flex flex-wrap gap-2 pt-1">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "size-8 rounded-full border transition-all cursor-pointer",
                  color === c ? "border-fg scale-110 ring-2 ring-brand/20" : "border-transparent opacity-80 hover:opacity-100"
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>
      </div>
    </Sheet>
  );
}
