"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  Copy,
  Check,
  Smartphone,
  Bell,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";
import QrCodeGenerator from "@/components/auto-tracking/QrCodeGenerator";
import { db } from "@/lib/db";
import type { Wallet } from "@/lib/types";
import { nowISO } from "@/lib/utils";
import { Card, CardHeader, Button, Badge, Select, Field, Spinner } from "@/components/ui";

const KNOWN_APPS = [
  { id: "id.co.bri.brimo", name: "BRImo", label: "Bank BRI (BRImo)", iconBg: "bg-blue-500/10 text-blue-400" },
  { id: "com.bca", name: "BCA Mobile", label: "BCA Mobile / myBCA", iconBg: "bg-cyan-500/10 text-cyan-400" },
  { id: "com.shopeepay.id", name: "ShopeePay", label: "ShopeePay Indonesia", iconBg: "bg-amber-500/10 text-amber-400" },
];

export default function AutoTrackingSettingsPage() {
  const [pairingPayload, setPairingPayload] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletMapping, setWalletMapping] = useState<Record<string, string>>({
    "id.co.bri.brimo": "",
    "com.bca": "",
    "com.shopeepay.id": "",
  });
  const [savingApp, setSavingApp] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const supabase = supabaseBrowser();
      let session = null;
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        session = data.session;
      }

      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://trakingduit.supabase.co";
      const apiUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/auto-transactions/ingest`
          : "https://trakingduit.vercel.app/api/auto-transactions/ingest";

      const payload = {
        api_url: apiUrl,
        supabase_url: supabaseUrl,
        access_token: session?.access_token || "",
        refresh_token: session?.refresh_token || "",
      };

      setPairingPayload(JSON.stringify(payload));
      setIsConnected(Boolean(session?.access_token));

      try {
        const d = db();
        const allWallets = await d.wallets.where("archived").equals(0).toArray();
        setWallets(allWallets);

        const initialMapping: Record<string, string> = {
          "id.co.bri.brimo": "",
          "com.bca": "",
          "com.shopeepay.id": "",
        };

        allWallets.forEach((w: Wallet) => {
          if (w.auto_app_identifier) {
            initialMapping[w.auto_app_identifier] = w.id;
          }
        });

        setWalletMapping(initialMapping);
      } catch (err) {
        console.error("Failed to load wallets:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleCopy = () => {
    if (!pairingPayload) return;
    navigator.clipboard.writeText(pairingPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWalletChange = async (appId: string, walletId: string) => {
    setSavingApp(appId);
    setSaveSuccess(null);
    try {
      const d = db();
      const prevWallet = wallets.find((w) => w.auto_app_identifier === appId);
      if (prevWallet && prevWallet.id !== walletId) {
        await d.wallets.update(prevWallet.id, {
          auto_app_identifier: null,
          updated_at: nowISO(),
        });
      }

      if (walletId) {
        await d.wallets.update(walletId, {
          auto_app_identifier: appId,
          updated_at: nowISO(),
        });
      }

      const supabase = supabaseBrowser();
      if (supabase) {
        if (prevWallet && prevWallet.id !== walletId) {
          await supabase
            .from("wallets")
            .update({ auto_app_identifier: null })
            .eq("id", prevWallet.id);
        }
        if (walletId) {
          await supabase
            .from("wallets")
            .update({ auto_app_identifier: appId })
            .eq("id", walletId);
        }
      }

      setWalletMapping((prev) => ({ ...prev, [appId]: walletId }));
      const updatedWallets = await d.wallets.where("archived").equals(0).toArray();
      setWallets(updatedWallets);
      setSaveSuccess(appId);
      setTimeout(() => setSaveSuccess(null), 2500);
    } catch (err) {
      console.error("Failed to update wallet mapping:", err);
    } finally {
      setSavingApp(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar / Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="grid size-9 place-items-center rounded-xl bg-surface-2 text-muted transition-colors hover:bg-border/60 hover:text-fg"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Auto-Catat Transaksi (Android APK)</h1>
            <p className="text-xs text-muted">
              Integrasi Companion Android (BRImo, BCA Mobile, ShopeePay)
            </p>
          </div>
        </div>

        <Badge tone={isConnected ? "income" : "warn"}>
          {isConnected ? "Akun Terhubung" : "Belum Auth Cloud"}
        </Badge>
      </div>

      {/* Main Installation Steps Card */}
      <Card>
        <CardHeader
          title="Panduan Instalasi & Hubungkan App"
          subtitle="3 langkah mudah untuk mengaktifkan pencatatan transaksi otomatis"
        />

        <div className="divide-y divide-border p-4">
          {/* STEP 1 */}
          <div className="space-y-3 pb-5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                1
              </span>
              <h3 className="text-sm font-medium">Langkah 1: Unduh APK Companion</h3>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="/downloads/trakingduit-companion.apk"
                download="trakingduit-companion.apk"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-brand-fg transition shadow-sm shadow-brand/20 hover:brightness-110"
              >
                <Download className="size-4" /> Unduh Companion APK
              </a>
            </div>

            <div className="rounded-lg bg-surface-2 p-3 text-xs text-muted">
              <p>
                <strong className="font-medium text-fg">Petunjuk:</strong> Buka file .apk yang
                didownload di HP Android &gt; pilih Install (Izinkan Install dari sumber tidak dikenal jika diminta).
              </p>
            </div>
          </div>

          {/* STEP 2 */}
          <div className="space-y-3 py-5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                2
              </span>
              <h3 className="text-sm font-medium">Langkah 2: Buka App &amp; Hubungkan Akun</h3>
            </div>

            <div className="rounded-lg bg-surface-2 p-3 text-xs text-muted">
              <p>
                Buka aplikasi Companion di Android, scan QR di bawah atau paste kode autentikasi.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface p-4 text-center">
                {pairingPayload ? (
                  <QrCodeGenerator value={pairingPayload} size={180} />
                ) : (
                  <div className="flex h-44 w-44 items-center justify-center text-muted">
                    <Spinner className="size-6" />
                  </div>
                )}
              </div>

              {/* Pairing Code String / One-tap Copy */}
              <div className="space-y-3">
                <Field label="Kode Autentikasi / Payload Session">
                  <div className="relative">
                    <textarea
                      readOnly
                      rows={4}
                      value={pairingPayload || "Memuat payload autentikasi..."}
                      className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-xs font-mono text-muted outline-none"
                    />
                  </div>
                </Field>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopy}
                  className="w-full"
                  disabled={!pairingPayload}
                >
                  {copied ? (
                    <>
                      <Check className="size-4 text-income" /> Kode Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="size-4 text-muted" /> Salin Kode Autentikasi
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* STEP 3 */}
          <div className="space-y-3 pt-5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                3
              </span>
              <h3 className="text-sm font-medium">Langkah 3: Aktifkan Izin Notifikasi</h3>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 p-3.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
                <Bell className="size-4" />
              </span>
              <div className="space-y-1 text-xs">
                <p className="font-medium text-fg">Izin Notification Access Android</p>
                <p className="text-muted">
                  Di HP Android, masuk ke Pengaturan HP &gt; Akses Notifikasi (Notification Access) &gt;
                  Aktifkan TrackingDuit Companion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Wallet Mapping Section */}
      <Card>
        <CardHeader
          title="Pemetaan Wallet & Aplikasi Finansial"
          subtitle="Pilih ke wallet mana transaksi dari notifikasi bank akan otomatis dicatat"
        />

        <div className="p-4 space-y-4">
          {wallets.length === 0 && !loading && (
            <div className="flex items-center gap-2 rounded-xl border border-warn/20 bg-warn/10 p-3 text-xs text-warn">
              <AlertCircle className="size-4 shrink-0" />
              <span>Belum ada Wallet terdaftar. Buat wallet di halaman Wallets terlebih dahulu.</span>
            </div>
          )}

          <div className="grid gap-3">
            {KNOWN_APPS.map((app) => {
              const currentWalletId = walletMapping[app.id] || "";
              const isSaving = savingApp === app.id;
              const isSaved = saveSuccess === app.id;

              return (
                <div
                  key={app.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className={`grid size-9 place-items-center rounded-lg ${app.iconBg}`}>
                      <Smartphone className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-fg">{app.label}</p>
                      <p className="text-[11px] text-muted">ID: {app.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:w-64">
                    <Select
                      value={currentWalletId}
                      onChange={(e) => handleWalletChange(app.id, e.target.value)}
                      disabled={isSaving || wallets.length === 0}
                      className="text-xs"
                    >
                      <option value="">-- Pilih Wallet Target --</option>
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </Select>

                    {isSaving && <Spinner className="size-4 shrink-0 text-brand" />}
                    {isSaved && <CheckCircle2 className="size-4 shrink-0 text-income" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
