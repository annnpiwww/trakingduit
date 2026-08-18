"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  ChevronLeft,
  ArrowRight,
  Download,
  QrCode,
  Bell,
  Wallet as WalletIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase";
import QrCodeGenerator from "@/components/auto-tracking/QrCodeGenerator";
import { db } from "@/lib/db";
import type { Wallet } from "@/lib/types";
import { nowISO } from "@/lib/utils";

const KNOWN_APPS = [
  { id: "id.co.bri.brimo", name: "BRImo (Bank BRI)", color: "text-blue-400" },
  { id: "com.bca", name: "BCA Mobile / myBCA", color: "text-cyan-400" },
  { id: "com.shopeepay.id", name: "ShopeePay", color: "text-orange-400" },
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

      // Load session
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

      // Load local wallets
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
      // 1. Clear auto_app_identifier from any wallet that previously had it
      const prevWallet = wallets.find((w) => w.auto_app_identifier === appId);
      if (prevWallet && prevWallet.id !== walletId) {
        await d.wallets.update(prevWallet.id, {
          auto_app_identifier: null,
          updated_at: nowISO(),
        });
      }

      // 2. Set auto_app_identifier on new wallet
      if (walletId) {
        await d.wallets.update(walletId, {
          auto_app_identifier: appId,
          updated_at: nowISO(),
        });
      }

      // 3. Update Supabase if connected
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

      // Update state
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
    <div className="max-w-2xl mx-auto px-4 py-6 text-slate-100">
      {/* Header & Back Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Pairing Companion App</h1>
            <p className="text-xs text-slate-400">
              Otomasi Notifikasi Finansial Android (BRImo, BCA, ShopeePay)
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold">
          {isConnected ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400">Companion App Disambung</span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-amber-400">Belum Terhubung</span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Main Pairing Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-300">
            <Smartphone className="w-7 h-7 shrink-0 text-emerald-400" />
            <div className="text-xs leading-relaxed">
              <span className="font-semibold text-emerald-200">
                Buka TrakingDuit Companion App
              </span>{" "}
              di HP Android kamu, pilih menu <strong>Scan Pair QR</strong> lalu arahkan kamera ke
              kode QR di bawah ini.
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
              <span className="text-xs">Generating Pairing Token...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4">
              <QrCodeGenerator value={pairingPayload} size={220} />

              <div className="w-full pt-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Kode Pairing Manual (Opsional)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={pairingPayload}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 pr-24 font-mono truncate"
                  />
                  <button
                    onClick={handleCopy}
                    className="absolute right-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Salin
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" /> Token Terenkripsi End-to-End
            </span>
            <a
              href="/download/trakingduit-companion.apk"
              download
              className="text-slate-300 hover:text-white font-semibold flex items-center gap-1"
            >
              Download Companion APK <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Step-by-Step Guide */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h2 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" /> Langkah Pemasangan Companion App
          </h2>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-emerald-400" /> Step 1: Download APK
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Unduh aplikasi APK TrakingDuit Companion ke smartphone Android kamu.
                </p>
                <a
                  href="/download/trakingduit-companion.apk"
                  download
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold mt-1"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh trakingduit-companion.apk
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" /> Step 2: Scan QR Code
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Buka aplikasi Companion di Android, pilih menu Scan Pair QR lalu arahkan ke QR Code di atas (atau tempel pairing payload string secara manual).
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                3
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-emerald-400" /> Step 3: Berikan Akses Notifikasi
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Aktifkan izin Notification Access di Pengaturan Android agar Companion App dapat membaca notifikasi BRImo, BCA, dan ShopeePay secara lokal.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Auto-Matching Configuration Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <WalletIcon className="w-5 h-5 text-emerald-400" /> Konfigurasi Auto-Matching Wallet
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Pilih dompet/rekening tujuan untuk setiap aplikasi finansial agar transaksi otomatis tersimpan di wallet yang sesuai.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            {KNOWN_APPS.map((app) => {
              const currentWalletId = walletMapping[app.id] || "";
              const isSaving = savingApp === app.id;
              const isSaved = saveSuccess === app.id;

              return (
                <div
                  key={app.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800"
                >
                  <div>
                    <span className={`text-xs font-bold ${app.color}`}>{app.name}</span>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{app.id}</p>
                  </div>

                  <div className="flex items-center gap-2 sm:w-64">
                    <select
                      value={currentWalletId}
                      onChange={(e) => handleWalletChange(app.id, e.target.value)}
                      disabled={isSaving}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                    >
                      <option value="">-- Pilih Wallet --</option>
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.type})
                        </option>
                      ))}
                    </select>

                    {isSaving && <RefreshCw className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />}
                    {isSaved && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>

          {wallets.length === 0 && !loading && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-950/40 border border-amber-500/20 text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Belum ada Wallet terdaftar. Buat wallet di halaman Wallets terlebih dahulu.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
