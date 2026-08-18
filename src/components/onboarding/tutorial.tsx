"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HandCoins, ListPlus, MonitorSmartphone, Sparkles, WalletCards } from "lucide-react";
import { Button } from "@/components/ui";
import { InstallPrompt } from "@/components/install/install-prompt";
import { cn } from "@/lib/utils";
import { usePWAInstall } from "@/lib/use-pwa-install";

// Bump versi key tiap tutorial dirombak signifikan, biar yang udah pernah
// lihat versi lama tetap dapat tutorial baru sekali lagi.
const ONBOARD_KEY = "td.onboarded.v2";

type TourStep = {
  /** querySelector target yang disorot; undefined = kartu tengah (tanpa spotlight). */
  sel?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  tip: string;
  /** Step ini nampilin panduan install PWA (kartu tengah). */
  install?: boolean;
};

const BASE_STEPS: TourStep[] = [
  {
    sel: "[data-tour='balance']",
    icon: WalletCards,
    title: "Ini saldo kamu",
    body: "Total saldo semua dompet kamu dalam satu kartu. Pencet ikon mata buat nyembunyiin nominal, chip mood nunjukin kondisi duit kamu bulan ini.",
    tip: "Saldo auto-update tiap kamu catat transaksi.",
  },
  {
    sel: "[data-tour='tile-debts']",
    icon: HandCoins,
    title: "Fitur baru: Utang Piutang",
    body: "Shortcut ini ngebuka halaman utang piutang. Catat siapa yang minjem ke kamu (piutang) atau yang kamu utangi (utang), lengkap sama jatuh tempo.",
    tip: "Sekali bayar/terima, transaksinya langsung kebuat otomatis.",
  },
  {
    sel: "[data-tour='tradu']",
    icon: Sparkles,
    title: "Tanya Tradu ✨",
    body: "Asisten AI buat ngobrolin duit kamu. Roast pengeluaran, tips nabung, sampe bantu baca laporan keuangan.",
    tip: "Klik kartu ini kapan aja buat mulai chat.",
  },
  {
    sel: "[data-tour='add']",
    icon: ListPlus,
    title: "Catat transaksi",
    body: "Tombol ini buat catat pemasukan, pengeluaran, atau transfer antar dompet dalam hitungan detik.",
    tip: "Pake kategori biar laporan bulanan kamu rapi.",
  },
  {
    icon: MonitorSmartphone,
    title: "Install App Android (Auto-Catat) 📲",
    body: "Pasang Aplikasi Android TrackingDuit (~2.8 MB)! Aplikasi ini otomatis membaca notifikasi m-banking (BRImo, BCA, Livin, BNI) & e-wallet (GoPay, OVO, DANA, ShopeePay) untuk langsung mencatat transaksi kamu tanpa ribet ketik manual.",
    tip: "Langsung klik tombol 'Unduh APK Android' untuk memasang.",
    install: true,
  },
  {
    icon: Sparkles,
    title: "Siap mulai! 🚀",
    body: "Kamu udah kenal fitur utama. Scan struk, tagihan, budget, target nabung, dan analisis nunggu di menu.",
    tip: "Data kamu aman di perangkat & bisa sync ke cloud.",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 16; // jarak aman ke tepi viewport
const GAP = 14; // jarak tooltip ke elemen
const TOOLTIP_H = 280; // estimasi tinggi tooltip (di-clamp; step install lebih tinggi)
const HOLE_PAD = 4;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Panah accent yang nunjuk ke elemen yang disorot. */
function TourArrow({ dir, x }: { dir: "up" | "down"; x: number }) {
  return (
    <svg
      width="20"
      height="12"
      viewBox="0 0 20 12"
      className={cn(
        "absolute left-0 z-10 -translate-x-1/2",
        dir === "up" ? "-top-[11px]" : "-bottom-[11px]",
      )}
      style={{ left: x }}
      aria-hidden
    >
      <path
        d={dir === "up" ? "M1 11 L10 1 L19 11" : "M1 1 L10 11 L19 1"}
        fill="var(--accent)"
        stroke="var(--surface)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OnboardingTutorial() {
  const { status } = usePWAInstall();
  const [visible, setVisible] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [rect, setRect] = React.useState<Rect | null>(null);
  const [ready, setReady] = React.useState(false);
  // Skip step install PWA kalau udah jalan sebagai app (standalone).
  const steps = React.useMemo(
    () => (status === "installed" ? BASE_STEPS.filter((s) => !s.install) : BASE_STEPS),
    [status],
  );
  // steps bisa menyusut saat status jadi "installed" (appinstalled) di tengah tour —
  // clamp index biar nggak crash (current jadi undefined).
  const idx = Math.min(step, Math.max(0, steps.length - 1));
  const current = steps[idx];
  const isLast = idx === steps.length - 1;

  // Tampilkan sekali per perangkat, setelah dashboard sempat render.
  React.useEffect(() => {
    if (localStorage.getItem(ONBOARD_KEY) === "1") return;
    const t = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(t);
  }, []);

  /** Ambil elemen pertama yang benar-benar terlihat (layout display:none → rect 0). */
  const findVisible = React.useCallback((sel: string): Element | null => {
    const nodes = Array.from(document.querySelectorAll(sel));
    for (const el of nodes) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
    return null;
  }, []);

  const measure = React.useCallback(() => {
    const target = current.sel ? findVisible(current.sel) : null;
    if (!target) {
      setRect(null);
      setReady(true);
      return;
    }
    const r = target.getBoundingClientRect();
    setRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    });
    setReady(true);
  }, [current.sel, findVisible]);

  // Scroll target ke tengah viewport, tunggu scroll selesai, baru ukur posisi.
  React.useEffect(() => {
    if (!visible) return;
    setReady(false);
    const target = current.sel ? findVisible(current.sel) : null;
    if (!target) {
      measure();
      return;
    }
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    // retry sampai elemen ketemu (dashboard bisa masih loading) / scroll settle
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (findVisible(current.sel!)) {
        measure();
        window.clearInterval(timer);
      } else if (tries > 40) {
        setRect(null);
        setReady(true);
        window.clearInterval(timer);
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [visible, step, current.sel, measure]);

  // Ukur ulang pas resize / scroll.
  React.useEffect(() => {
    if (!visible || !ready) return;
    let ticking = false;
    const onResize = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        measure();
        ticking = false;
      });
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [visible, ready, measure]);

  const finish = React.useCallback(() => {
    localStorage.setItem(ONBOARD_KEY, "1");
    setVisible(false);
    setStep(0);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("td:tutorial_finished"));
    }
  }, []);

  const next = React.useCallback(() => {
    if (isLast) finish();
    else setStep((s) => s + 1);
  }, [isLast, finish]);

  // Escape = selesai.
  React.useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, finish]);

  // Posisi tooltip relatif ke elemen target.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const tooltipW = Math.min(330, vw - PAD * 2);
  let pos: { top: number; left: number; dir: "up" | "down"; arrowX: number } | null = null;

  if (rect && vw > 0) {
    const below = rect.top + rect.height + GAP + TOOLTIP_H <= vh - PAD;
    const top = below
      ? rect.top + rect.height + GAP
      : Math.max(PAD, rect.top - GAP - TOOLTIP_H);
    const left = clamp(rect.left + rect.width / 2 - tooltipW / 2, PAD, vw - tooltipW - PAD);
    const arrowX = clamp(rect.left + rect.width / 2 - left, 28, tooltipW - 28);
    pos = { top, left, dir: below ? "up" : "down", arrowX };
  } else {
    pos = { top: Math.round(vh / 2 - TOOLTIP_H / 2), left: PAD, dir: "down", arrowX: 0 };
  }

  return (
    <AnimatePresence>
      {visible ? (
        <div
          className="fixed inset-0 z-[80]"
          role="dialog"
          aria-modal="true"
          aria-label="Tur singkat TrakingDuit"
          onClick={next}
        >
          {/* Overlay gelap + hole spotlight */}
          {rect && ready ? (
            <motion.div
              className="pointer-events-none absolute z-[1] rounded-2xl"
              initial={false}
              animate={{
                top: rect.top - HOLE_PAD,
                left: rect.left - HOLE_PAD,
                width: rect.width + HOLE_PAD * 2,
                height: rect.height + HOLE_PAD * 2,
              }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              style={{
                boxShadow:
                  "0 0 0 9999px rgba(2,6,23,0.66), 0 0 0 2px var(--accent), 0 0 28px rgba(232,96,12,0.5)",
              }}
            >
              <span className="absolute -inset-2 animate-pulse rounded-2xl border-2 border-accent/70" />
            </motion.div>
          ) : null}

          {/* Tooltip */}
          {ready ? (
            <motion.div
              className="absolute z-[2]"
              style={{ top: pos.top, left: pos.left, width: tooltipW }}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              {rect ? <TourArrow dir={pos.dir} x={pos.arrowX} /> : null}

              <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-(--shadow-pop)">
                {/* Progress bar */}
                <div className="absolute inset-x-0 top-0 h-1 bg-surface-2">
                  <motion.div
                    className="h-full rounded-r-full bg-[linear-gradient(90deg,#e8600c,#ff8a3d)]"
                    initial={false}
                    animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>

                <div className="px-5 pt-4 pb-3">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                      {(() => {
                        const Icon = current.icon;
                        return <Icon className="size-5" />;
                      })()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold tracking-widest text-accent uppercase">
                        {step + 1} dari {steps.length}
                      </p>
                      <h3 className="mt-0.5 text-sm font-semibold tracking-tight">{current.title}</h3>
                    </div>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-muted">{current.body}</p>
                  {current.install ? (
                    <div className="mt-3">
                      <InstallPrompt compact />
                    </div>
                  ) : (
                    <p className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11px] leading-snug text-muted">
                      <span aria-hidden>💡</span>
                      <span>{current.tip}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 border-t border-border px-5 py-3">
                  <Button variant="ghost" size="sm" className="h-9 flex-1" onClick={finish}>
                    Lewati
                  </Button>
                  <Button size="sm" className="h-9 flex-1" onClick={next}>
                    {isLast ? "Mulai!" : "Lanjut"}
                    <span aria-hidden>→</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </div>
      ) : null}
    </AnimatePresence>
  );
}
