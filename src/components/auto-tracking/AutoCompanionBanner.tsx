"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Smartphone, X, Zap, ArrowRight, ShieldCheck } from "lucide-react";

export const BANNER_DISMISSED_KEY = "trakingduit_companion_banner_dismissed";
export const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export function shouldShowBanner(storedValue: string | null, now = Date.now()): boolean {
  if (!storedValue) return true;
  const timestamp = parseInt(storedValue, 10);
  if (!isNaN(timestamp)) {
    return now - timestamp >= FOURTEEN_DAYS_MS;
  }
  if (storedValue === "true") return false;
  return true;
}

export function AutoCompanionBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    setVisible(shouldShowBanner(dismissed));
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      data-testid="auto-companion-banner"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 p-4 border border-emerald-500/30 shadow-lg mb-4 text-white"
    >
      <button
        onClick={handleDismiss}
        data-testid="dismiss-banner-btn"
        className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer"
        aria-label="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3.5">
        <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
          <Smartphone className="w-6 h-6" />
        </div>

        <div className="flex-1 pr-6">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Zap className="w-3 h-3" /> Fitur Otomatis
            </span>
          </div>

          <h4 className="text-sm font-bold text-slate-100">
            Otomatis Catat Transaksi BRImo, BCA & ShopeePay!
          </h4>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Aktifkan <strong>TrakingDuit Auto-Companion APK</strong> di Android kamu. Notifikasi bank bakal otomatis tercatat tanpa perlu ketik manual.
          </p>

          <div className="flex items-center gap-2 mt-2.5 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Aman & Privasi Terjaga
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Link
              href="/settings/auto-tracking"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-semibold text-xs rounded-xl shadow-md transition-all font-medium"
            >
              Aktifkan Auto-Tracking <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
