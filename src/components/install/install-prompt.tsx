"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Download, Smartphone, Sparkles, Bell, Share, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui";
import { usePWAInstall } from "@/lib/use-pwa-install";

/**
 * Panduan & Tombol Install PWA untuk iPhone (iOS Safari) & Android:
 * - iPhone/iPad: Panduan 3 langkah Add to Home Screen (Share -> Tambah ke Layar Utama)
 * - Android: Tombol Direct Download APK Android Auto-Catat (2.8 MB) + Option Web PWA
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
      {/* Dynamic Render Based on Platform */}
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
        ) : status === "ios" ? (
          <motion.div
            key="ios"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-3.5 space-y-2">
              <h4 className="text-sm font-semibold text-fg flex items-center gap-1.5">
                Pasang di iPhone / iPad 📲
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                Pasang TrakingDuit di Home Screen iPhone kamu lewat Safari biar bisa dibuka fullscreen kayak aplikasi native:
              </p>
            </div>

            <ol className="space-y-2">
              <IOSStep
                n={1}
                icon={<Share className="size-4" />}
                text={
                  <span>
                    Tap tombol <b>Bagikan (Share)</b> di bagian bawah browser Safari.
                  </span>
                }
              />
              <IOSStep
                n={2}
                icon={<PlusSquare className="size-4" />}
                text={
                  <span>
                    Gulir ke bawah, lalu pilih <b>Tambah ke Layar Utama (Add to Home Screen)</b>.
                  </span>
                }
              />
              <IOSStep
                n={3}
                icon={<CheckCircle2 className="size-4" />}
                text={
                  <span>
                    Tap <b>Tambah (Add)</b> di pojok kanan atas. Selesai!
                  </span>
                }
              />
            </ol>
          </motion.div>
        ) : (
          <motion.div
            key="android-default"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            {/* Highlight Android APK Auto-Tracking */}
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
                <Download className="size-4" /> Unduh APK Android (3.7 MB)
              </a>
            </div>

            {status === "installable" && (
              <Button className="w-full" variant="outline" size={compact ? "sm" : "lg"} onClick={handleInstall} disabled={installing}>
                <Smartphone className="size-4" />
                {installing ? "Memasang..." : "Pasang versi Web PWA"}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IOSStep({ n, icon, text }: { n: number; icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-surface-2 px-3.5 py-2.5">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-brand-fg">
        {n}
      </span>
      <span className="flex items-center gap-2 text-brand">{icon}</span>
      <span className="text-xs leading-relaxed text-fg">{text}</span>
    </li>
  );
}
