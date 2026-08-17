"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Crown, X } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { BuntingFlagsSVG, WavingFlagSVG, MerdekaBadge } from "@/components/ui/indonesia-decorations";
import { getAnimation, sheetContent, sheetOverlay } from "@/lib/animations";

const PROMO_CODE = "PROMOMEREDEKA";
const STORAGE_KEY = "merdeka_promo_seen_2026";

export function PromoMerdekaModal() {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const router = useRouter();
  const toast = useToast();

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const now = new Date();
    const month = now.getMonth(); // 7 = August (0-indexed)
    const date = now.getDate();
    const year = now.getFullYear();
    const todayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;

    // Aktif antara 17-20 Agustus 2026 (atau override via query param ?promo=merdeka)
    const forceShow = typeof window !== "undefined" && window.location.search.includes("promo=merdeka");
    const isMerdekaPeriod = (month === 7 && date >= 17 && date <= 20) || forceShow;

    const lastSeen = localStorage.getItem(STORAGE_KEY);

    if (isMerdekaPeriod && lastSeen !== todayStr) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    const now = new Date();
    const month = now.getMonth();
    const date = now.getDate();
    const year = now.getFullYear();
    const todayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
    localStorage.setItem(STORAGE_KEY, todayStr);
    setOpen(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      toast("Kode promo PROMOMEREDEKA berhasil disalin!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Gagal menyalin kode promo", "error");
    }
  };

  const handleClaim = () => {
    handleClose();
    router.push(`/premium?code=${PROMO_CODE}`);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
            variants={getAnimation(sheetOverlay)}
            initial="hidden"
            animate="visible"
            exit="exit"
          />

          {/* Modal Card Merah-Putih */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Promo Merdeka 17 Agustus"
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-red-500/40 bg-surface shadow-2xl"
            variants={getAnimation(sheetContent)}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Rumbai / Bunting Flag di Bagian Paling Atas Modal */}
            <div className="absolute top-0 inset-x-0 z-20 pointer-events-none">
              <BuntingFlagsSVG className="w-full h-8 opacity-90" />
            </div>

            {/* Header Banner Merah Putih */}
            <div className="relative bg-gradient-to-br from-red-600 via-red-500 to-red-700 px-6 pt-9 pb-6 text-center text-white shadow-inner">
              {/* Ornamen Bendera Merah Putih & Ribbon BG */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-25">
                <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white blur-2xl" />
                <div className="absolute -bottom-10 -left-10 size-40 rounded-full bg-red-900 blur-xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4)_1px,transparent_1px)] bg-[size:12px_12px]" />
              </div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-3.5 right-3.5 z-30 rounded-full bg-black/20 p-1.5 text-white/80 transition hover:bg-black/40 hover:text-white"
                aria-label="Tutup promo"
              >
                <X className="size-4" />
              </button>

              {/* Flag Badge & Title */}
              <div className="relative z-10 space-y-2.5">
                <div className="flex justify-center items-center gap-2">
                  <WavingFlagSVG className="size-9 drop-shadow-md" />
                  <MerdekaBadge />
                  <WavingFlagSVG className="size-9 drop-shadow-md -scale-x-100" />
                </div>

                <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl drop-shadow-sm">
                  Dirgahayu Republik Indonesia!
                </h2>

                <p className="text-xs leading-relaxed text-red-100/90 sm:text-sm">
                  Rayakan Kemerdekaan bersama <b>TrakingDuit</b>! Nikmati gratis akses <b>Pro Premium</b> dengan fitur AI tanpa batas.
                </p>
              </div>
            </div>

            {/* Content Body */}
            <div className="space-y-5 p-6">
              {/* Box Kode Promo Highlight Merah Putih */}
              <div className="rounded-2xl border-2 border-amber-300/70 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-4 text-center text-white shadow-lg shadow-red-500/25 ring-2 ring-amber-400/20">
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold tracking-wider uppercase text-amber-200">
                  <Crown className="size-3.5 fill-amber-300 text-amber-300" />
                  <span>KODE PROMO KEMERDEKAAN</span>
                  <Crown className="size-3.5 fill-amber-300 text-amber-300" />
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border-2 border-dashed border-amber-200/80 bg-red-950/40 px-4 py-3 backdrop-blur-sm shadow-inner">
                  <span className="font-mono text-xl font-black tracking-widest text-white drop-shadow-md">
                    {PROMO_CODE}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-red-950 shadow-md transition hover:bg-amber-300 active:scale-95"
                  >
                    {copied ? <Check className="size-3.5 stroke-[3]" /> : <Copy className="size-3.5 stroke-[3]" />}
                    <span>{copied ? "Tersalin!" : "Salin Kode"}</span>
                  </button>
                </div>

                <p className="mt-2 text-[11px] text-red-100 font-medium">
                  Buka semua akses kuota Tradu & Scan Struk tanpa batas.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={handleClaim}
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md shadow-red-500/20 hover:from-red-700 hover:to-red-600"
                  size="lg"
                >
                  <Crown className="size-4.5" />
                  Klaim di Premium
                </Button>
                <Button
                  onClick={handleClose}
                  variant="ghost"
                  className="w-full text-xs text-muted"
                  size="sm"
                >
                  Nanti Saja
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
