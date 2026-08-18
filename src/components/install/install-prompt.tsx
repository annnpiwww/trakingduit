"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Download, Smartphone, Sparkles, Bell } from "lucide-react";
import { Button } from "@/components/ui";
import { usePWAInstall } from "@/lib/use-pwa-install";

/**
 * Panduan & Tombol Install Aplikasi Android / PWA:
 * - Menyoroti keunggulan otomatisasi notifikasi bank (BCA, BRImo, Livin, GoPay, OVO, ShopeePay)
 * - Tombol direct download APK Android (2.8 MB)
 */
export function InstallPrompt({ compact = false }: { compact?: boolean }) {
  const { status, install } = usePWAInstall();
  const [installing, setInstalling] = React.useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await install();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Primary Highlight: Android App APK Auto-Tracking */}
      <div className="rounded-xl border border-brand/20 bg-brand/5 p-3.5 space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand text-brand-fg shadow-sm">
            <Bell className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-fg flex items-center gap-1.5">
              App Android Auto-Catat <Sparkles className="size-3.5 text-amber-400 fill-amber-400" />
            </h4>
            <p className="text-xs text-muted leading-relaxed mt-0.5">
              Otomatis catat transaksi finansial dari notifikasi m-banking (BRImo, BCA, Livin, BNI) &amp; e-wallet (GoPay, OVO, DANA, ShopeePay) tanpa perlu ketik manual.
            </p>
          </div>
        </div>

        <a
          href="/download/TrackingDuit.apk"
          download="TrackingDuit.apk"
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-brand-fg transition shadow-sm shadow-brand/20 hover:brightness-110"
        >
          <Download className="size-4" /> Unduh APK Android (2.8 MB)
        </a>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {status === "installed" ? (
          <motion.div
            key="installed"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-2.5 rounded-xl bg-income/10 px-3.5 py-3 text-income"
          >
            <CheckCircle2 className="size-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">TrakingDuit udah terpasang</p>
              <p className="text-xs opacity-80">Buka langsung dari home screen HP kamu.</p>
            </div>
          </motion.div>
        ) : status === "installable" ? (
          <motion.div
            key="installable"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-2 pt-1"
          >
            <Button className="w-full" variant="outline" size={compact ? "sm" : "lg"} onClick={handleInstall} disabled={installing}>
              <Smartphone className="size-4" />
              {installing ? "Memasang..." : "Pasang versi Web PWA"}
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
