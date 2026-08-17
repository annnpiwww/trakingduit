"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  Check,
  Crown,
  Flame,
  Infinity as InfinityIcon,
  Palette,
  ScanLine,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { activateTier, TIERS, TIER_ORDER, useSubscription, type TierId } from "@/lib/subscription";
import { Button, Card, Field, Input, Sheet, useToast } from "@/components/ui";
import { BuntingFlagsSVG, WavingFlagSVG, MerdekaBadge, RedWhiteRibbonSVG } from "@/components/ui/indonesia-decorations";
import { cn, formatIDR } from "@/lib/utils";

/** Ikon benefit per tier — dipetakan dari teks supaya tiap kartu kaya visual. */
const BENEFIT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Tradu: Sparkles,
  Scan: ScanLine,
  Badge: Flame,
  Unduh: BadgeCheck,
  Download: BadgeCheck,
  Tema: Palette,
  Tanpa: InfinityIcon,
};

function BenefitIcon({ text }: { text: string }) {
  const key = Object.keys(BENEFIT_ICON).find((k) => text.startsWith(k));
  const Icon = (key && BENEFIT_ICON[key]) || Check;
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
      <Icon className="size-3" />
    </span>
  );
}

export default function PremiumPage() {
  const toast = useToast();
  const { tier, tradu, ocr, until } = useSubscription();
  const [activating, setActivating] = React.useState<TierId | null>(null);
  const [initialCode, setInitialCode] = React.useState("");
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get("code");
      if (codeParam) {
        setInitialCode(codeParam);
        setActivating("pro");
      }
    }
  }, []);

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.08 } },
  };
  const cardAnim = {
    hidden: reduceMotion ? {} : { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  return (
    <div className="space-y-5">
      {/* Banner Highlight Promo Merdeka */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border-2 border-amber-300/60 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-5 text-white shadow-xl shadow-red-600/20 ring-2 ring-amber-400/20"
      >
        {/* Rumbai / Bunting Flag di Atas Banner */}
        <div className="absolute top-0 inset-x-0 z-10 pointer-events-none opacity-80">
          <BuntingFlagsSVG className="w-full h-6" />
        </div>

        <div className="pointer-events-none absolute -right-6 -bottom-6 size-40 rounded-full bg-white/10 blur-2xl" />
        
        <div className="relative z-20 flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-md">
              <WavingFlagSVG className="size-8 drop-shadow" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <MerdekaBadge />
                <span className="text-xs font-bold text-amber-200">Gratis 7 Hari Pro!</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <h3 className="text-sm font-bold sm:text-base text-white">
                  Kode Promo:
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-amber-200 bg-red-950/50 px-3 py-1 font-mono text-base font-black tracking-widest text-amber-300 shadow-inner">
                  PROMOMEREDEKA
                </span>
              </div>
              <p className="text-xs text-red-100/90">
                Akses tanpa batas untuk fitur Tradu & Scan Struk AI selama 7 hari gratis!
              </p>
            </div>
          </div>
          
          <Button
            size="md"
            onClick={() => {
              setInitialCode("PROMOMEREDEKA");
              setActivating("pro");
            }}
            className="shrink-0 font-extrabold bg-amber-400 text-red-950 shadow-lg hover:bg-amber-300 active:scale-95 border border-amber-200"
          >
            <Crown className="size-4.5 stroke-[2.5]" />
            Klaim Promo
          </Button>
        </div>
      </motion.div>

      {/* Header */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold tracking-wide text-accent uppercase">
          Pilih paketmu
        </p>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Fitur AI Lebih Bebas. Pilih Paket Kamu.
        </h1>
        <p className="max-w-md text-xs text-muted sm:text-sm">
          Mulai gratis. Upgrade kapan saja jika butuh kuota Tradu & scan struk lebih banyak.
        </p>
      </div>

      {/* Kuota hari ini */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Kuota kamu hari ini</p>
          {tier !== "free" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand">
              <Crown className="size-3" />
              {TIERS[tier].name}
              {until ? ` · ${new Date(until).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}` : ""}
            </span>
          ) : null}
        </div>
        <div className="space-y-3">
          <QuotaRow
            icon={<Sparkles className="size-3.5" />}
            label="Tradu"
            quota={tradu}
          />
          <QuotaRow
            icon={<ScanLine className="size-3.5" />}
            label="Scan nota"
            quota={ocr}
          />
        </div>
      </Card>

      {/* Pricing cards */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid gap-3 md:grid-cols-3 md:gap-4"
      >
        {TIER_ORDER.map((id) => {
          const cfg = TIERS[id];
          const isCurrent = tier === id;
          const isPopular = cfg.popular;
          return (
            <motion.div key={id} variants={cardAnim} className="h-full">
              <PricingCard
                id={id}
                name={cfg.name}
                tagline={cfg.tagline}
                price={cfg.price}
                originalPrice={cfg.originalPrice}
                promoBadge={cfg.promoBadge}
                highlight={cfg.highlight}
                popular={isPopular}
                benefits={cfg.benefits}
                isCurrent={isCurrent}
                onUpgrade={() => setActivating(id)}
              />
            </motion.div>
          );
        })}
      </motion.div>


      <ActivationSheet
        open={Boolean(activating)}
        tier={activating}
        initialCode={initialCode}
        onClose={() => setActivating(null)}
        onActivated={(t) => {
          toast(`Level ${TIERS[t].name} aktif!`, "success");
          setActivating(null);
        }}
      />
    </div>
  );
}

function QuotaRow({
  icon,
  label,
  quota,
}: {
  icon: React.ReactNode;
  label: string;
  quota: { used: number; limit: number; unlimited: boolean; left: number };
}) {
  const pct = quota.unlimited ? 100 : Math.min(100, (quota.used / Math.max(1, quota.limit)) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="text-brand">{icon}</span>
          {label}
        </span>
        <span className="num text-muted">
          {quota.unlimited ? (
            "Tanpa batas"
          ) : (
            <>
              <span className={cn("font-semibold", quota.left === 0 ? "text-expense" : "text-fg")}>
                {quota.used}
              </span>
              /{quota.limit}
            </>
          )}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <motion.div
          className={cn(
            "h-full rounded-full",
            quota.unlimited
              ? "bg-[linear-gradient(90deg,var(--brand),var(--accent))]"
              : quota.left === 0
                ? "bg-expense"
                : "bg-brand",
          )}
          initial={{ width: 0 }}
          animate={{ width: `${quota.unlimited ? 100 : pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function PricingCard({
  id,
  name,
  tagline,
  price,
  originalPrice,
  promoBadge,
  highlight,
  popular,
  benefits,
  isCurrent,
  onUpgrade,
}: {
  id: TierId;
  name: string;
  tagline: string;
  price: number;
  originalPrice?: number;
  promoBadge?: string;
  highlight?: string;
  popular?: boolean;
  benefits: string[];
  isCurrent: boolean;
  onUpgrade: () => void;
}) {
  return (
    <Card
      className={cn(
        "relative flex h-full flex-col overflow-hidden p-5",
        popular
          ? "border-brand/40 bg-surface shadow-(--shadow-hover) ring-1 ring-brand/20"
          : id === "pro"
            ? "border-accent/25"
            : "",
      )}
    >
      {/* Glow dekoratif buat kartu populer */}
      {popular ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-brand/10 blur-2xl"
        />
      ) : null}
      {id === "pro" ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 -left-16 size-40 rounded-full bg-accent/10 blur-2xl"
        />
      ) : null}

      <div className="relative flex flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
            {id === "pro" ? <Crown className="size-4 text-accent" /> : popular ? <Star className="size-4 text-brand" /> : <Zap className="size-4 text-muted" />}
            {name}
          </span>
          {highlight ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                popular ? "bg-brand/15 text-brand" : id === "pro" ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted",
              )}
            >
              {highlight}
            </span>
          ) : null}
        </div>

        <p className="mb-4 text-xs text-muted">{tagline}</p>

        <div className="mb-5 flex flex-col justify-end min-h-[52px]">
          {originalPrice ? (
            <div className="mb-0.5 flex items-center gap-1 flex-wrap">
              <span className="line-through text-muted text-sm mr-2">
                {formatIDR(originalPrice)}
              </span>
              {promoBadge ? (
                <span className="rounded bg-red-100 dark:bg-red-950/60 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">
                  {promoBadge}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="flex items-end gap-1.5">
            <span
              className={cn(
                "num text-3xl font-bold tracking-tight",
                promoBadge ? "text-red-600 dark:text-red-400 font-bold" : ""
              )}
            >
              {price === 0 ? "Gratis" : formatIDR(price)}
            </span>
            {price > 0 ? <span className="pb-1 text-xs text-muted">/bulan</span> : null}
          </div>
        </div>

        <ul className="mb-5 flex-1 space-y-2.5">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[13px] leading-snug">
              <BenefitIcon text={b} />
              <span className="min-w-0 flex-1 text-fg/90">{b}</span>
            </li>
          ))}
        </ul>

        <Button
          className="w-full"
          variant={isCurrent ? "secondary" : popular || id === "pro" ? "primary" : "outline"}
          onClick={price === 0 ? undefined : onUpgrade}
          disabled={isCurrent || price === 0}
        >
          {isCurrent ? (
            <>
              <Check className="size-4" /> Paket aktif
            </>
          ) : price === 0 ? (
            "Gratis selamanya"
          ) : (
            <>Upgrade ke {name}</>
          )}
        </Button>
      </div>
    </Card>
  );
}

/* --------------------------- Aktivasi (mode uji) --------------------------- */

function ActivationSheet({
  open,
  tier,
  initialCode = "",
  onClose,
  onActivated,
}: {
  open: boolean;
  tier: TierId | null;
  initialCode?: string;
  onClose: () => void;
  onActivated: (t: TierId) => void;
}) {
  const toast = useToast();
  const [code, setCode] = React.useState(initialCode);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) setCode(initialCode);
  }, [open, initialCode]);

  if (!tier) return null;
  const targetTier: TierId = tier;
  const cfg = TIERS[targetTier];

  async function submit() {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/premium/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), tier: targetTier }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; tier?: TierId; days?: number };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal aktivasi");
      }
      // Tier dipakai dari balikan server: kode promo (mis. TRAKINGPRO → Pro) bisa
      // override tier yang diklik user.
      await activateTier(data.tier ?? targetTier, data.days ?? 30);
      onActivated(targetTier);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal aktivasi", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Aktifkan ${cfg.name}`}
      description={`${formatIDR(cfg.price)}/bulan · aktif 30 hari tiap aktivasi`}
      size="lg"
      footer={
        <Button
          className="w-full"
          size="lg"
          onClick={submit}
          disabled={!code.trim() || busy}
          loading={busy}
        >
          <Crown className="size-4" /> Aktifin sekarang
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-surface-2/60 p-4">
          <p className="mb-2 text-xs font-medium text-muted">Yang kamu dapat:</p>
          <ul className="space-y-1.5">
            {cfg.benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[13px]">
                <Check className="mt-0.5 size-3.5 shrink-0 text-brand" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <Field
          label="Kode aktivasi"
          hint="Masih mode uji sebelum payment live. Minta kode ke admin TrakingDuit."
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ketik kode aktivasi kamu"
            autoCapitalize="off"
            autoCorrect="off"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </Field>

        <p className="text-[11px] leading-relaxed text-muted">
          Payment QRIS/Midtrans lagi disiapin. Buat sekarang, premium diaktifin lewat kode
          dari admin.
        </p>
      </div>
    </Sheet>
  );
}
