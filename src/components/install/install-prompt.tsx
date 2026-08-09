"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Download, MonitorSmartphone, Share } from "lucide-react";
import { Button } from "@/components/ui";
import { usePWAInstall } from "@/lib/use-pwa-install";

/**
 * Panduan install PWA yang menyesuaikan perangkat:
 * - Android/Chrome/Edge → tombol "Install Aplikasi" (beforeinstallprompt)
 * - iPhone/iPad → langkah manual Add to Home Screen
 * - Sudah terpasang → badge hijau
 * - Browser lain → panduan menu browser
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
              <p className="text-sm font-semibold">TrackingDuit udah terpasang</p>
              <p className="text-xs opacity-80">Buka dari home screen, kayak app beneran.</p>
            </div>
          </motion.div>
        ) : status === "installable" ? (
          <motion.div
            key="installable"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-2"
          >
            <div className="flex items-start gap-2.5 rounded-xl bg-surface-2 px-3.5 py-3">
              <Download className="mt-0.5 size-5 shrink-0 text-brand" />
              <p className="text-xs leading-relaxed text-muted">
                Pasang TrackingDuit di home screen biar buka-nya lebih cepat & bisa dipakai
                tanpa internet.
              </p>
            </div>
            <Button className="w-full" size={compact ? "sm" : "lg"} onClick={handleInstall} disabled={installing}>
              <Download className="size-4" />
              {installing ? "Memasang..." : "Install Aplikasi"}
            </Button>
          </motion.div>
        ) : status === "ios" ? (
          <motion.div
            key="ios"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-2"
          >
            <p className="text-xs text-muted">
              iPhone/iPad nggak punya tombol install otomatis. Ikutin 2 langkah ini:
            </p>
            <ol className="space-y-2">
              <IOSStep
                n={1}
                icon={<Share className="size-4" />}
                text={
                  <>
                    Ketuk ikon <b>Bagikan</b> (kotak panah ke atas) di Safari.
                  </>
                }
              />
              <IOSStep
                n={2}
                icon={<MonitorSmartphone className="size-4" />}
                text={
                  <>
                    Scroll & pilih <b>“Tambahkan ke Layar Utama”</b> lalu <b>Tambahkan</b>.
                  </>
                }
              />
            </ol>
          </motion.div>
        ) : (
          <motion.div
            key="unsupported"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-start gap-2.5 rounded-xl bg-surface-2 px-3.5 py-3"
          >
            <MonitorSmartphone className="mt-0.5 size-5 shrink-0 text-brand" />
            <p className="text-xs leading-relaxed text-muted">
              Browser lo nggak dukung install otomatis. Buka aplikasi ini lewat{" "}
              <b>Chrome di Android</b> atau <b>Safari di iPhone</b> biar bisa dipasang.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IOSStep({ n, icon, text }: { n: number; icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-surface-2 px-3.5 py-2.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-brand-fg">
        {n}
      </span>
      <span className="flex items-center gap-2 text-brand">{icon}</span>
      <span className="text-xs leading-relaxed text-fg">{text}</span>
    </li>
  );
}
