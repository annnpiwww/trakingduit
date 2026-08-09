"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, HandCoins, ListOrdered, ScanLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";

const ONBOARD_KEY = "td.onboarded.v1";

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  tip: string;
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Catat duit, gampang banget",
    body: "TrackingDuit bantu lo pantau pemasukan, pengeluaran, dan target — semua di satu tempat, tanpa ribet.",
    tip: "Data lo aman di perangkat & bisa disinkron ke akun cloud.",
  },
  {
    icon: ListOrdered,
    title: "Catat transaksi 5 detik",
    body: "Pencet tombol + buat catat pemasukan, pengeluaran, atau transfer antar dompet. Tiap transaksi langsung masuk analisis.",
    tip: "Pakai kategori biar laporan bulanan lo makin rapi.",
  },
  {
    icon: ScanLine,
    title: "Scan struk auto-catat",
    body: "Foto struk belanja, TrackingDuit baca otomatis terus jadiin transaksi. Nggak perlu ketik manual.",
    tip: "Coba di menu Scan Nota kapan aja.",
  },
  {
    icon: CalendarClock,
    title: "Tagihan & target",
    body: "Set pengingat tagihan biar nggak telat bayar, pasang budget per kategori, dan kejar target nabung.",
    tip: "Notifikasi muncul pas tagihan mau jatuh tempo.",
  },
  {
    icon: HandCoins,
    title: "Utang piutang, beres!",
    body: "Fitur baru: catat siapa yang ngutang ke lo atau yang lo utangi, lengkap sama jatuh tempo. Sekali bayar, langsung kebuat transaksinya.",
    tip: "Lihat ringkasan piutang vs utang di dashboard halaman Utang Piutang.",
  },
];

export function OnboardingTutorial() {
  const { profile } = useSession();
  const [visible, setVisible] = React.useState(false);
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    const done = localStorage.getItem(ONBOARD_KEY) === "1";
    if (!done) {
      // slight delay biar dashboard sempat render dulu
      const t = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(t);
    }
  }, []);

  const finish = React.useCallback(() => {
    localStorage.setItem(ONBOARD_KEY, "1");
    setVisible(false);
  }, []);

  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Selamat datang di TrackingDuit"
            className="relative flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-surface shadow-(--shadow-pop) sm:rounded-3xl"
            initial={{ y: 80, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
          >
            {/* Header gradient */}
            <div
              className="relative overflow-hidden px-6 pt-8 pb-6 text-white"
              style={{ background: "var(--brand-grad)" }}
            >
              <div
                className="pointer-events-none absolute -top-16 -right-10 size-52 rounded-full opacity-20 blur-3xl"
                style={{ background: "#7cc4ff" }}
              />
              <div
                className="pointer-events-none absolute -bottom-20 -left-14 size-56 rounded-full opacity-15 blur-3xl"
                style={{ background: "#ff8a3d" }}
              />
              <div className="relative flex flex-col items-center text-center">
                <span className="grid size-14 place-items-center overflow-hidden rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/20">
                  <Image
                    src="/icons/logo.png"
                    alt="TrakingDuit"
                    width={96}
                    height={96}
                    className="size-full object-cover"
                  />
                </span>
                <p className="mt-3 text-lg font-bold tracking-tight">
                  Hai, {profile?.name?.split("@")[0] ?? "Kawan"}! 👋
                </p>
                <p className="mt-1 text-xs text-white/80">Yuk kenalan sama TrackingDuit dulu</p>
              </div>
            </div>

            {/* Step body */}
            <div className="relative min-h-[220px] flex-1 px-6 py-5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                      {(() => {
                        const Icon = STEPS[step].icon;
                        return <Icon className="size-5" />;
                      })()}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold tracking-tight">{STEPS[step].title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{STEPS[step].body}</p>
                      <p className="mt-2.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11px] text-muted">
                        💡 {STEPS[step].tip}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 pb-4">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200",
                    i === step ? "w-6 bg-brand" : "w-1.5 bg-border",
                  )}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 border-t border-border px-6 py-4">
              <Button variant="ghost" size="lg" className="flex-1" onClick={finish}>
                Lewati
              </Button>
              <Button size="lg" className="flex-1" onClick={() => (isLast ? finish() : setStep((s) => s + 1))}>
                {isLast ? "Mulai!" : "Lanjut"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
