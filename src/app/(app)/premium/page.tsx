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
import { useRouter } from "next/navigation";
import { activateTier, TIERS, TIER_ORDER, useSubscription, type TierId } from "@/lib/subscription";
import { Button, Card, Field, Input, Sheet, useToast } from "@/components/ui";
import { cn, formatIDR } from "@/lib/utils";

/** Ikon benefit per tier — dipetakan dari teks supaya tiap kartu kaya visual. */
const BENEFIT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Tradu: Sparkles,
  Scan: ScanLine,
  Badge: Flame,
  Unduh: BadgeCheck,
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
  const router = useRouter();
  const { tier, tradu, ocr, until } = useSubscription();
  const [activating, setActivating] = React.useState<TierId | null>(null);
  const reduceMotion = useReducedMotion();

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
      {/* Header */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold tracking-wide text-accent uppercase">
          Naikkan level TrackingDuit
        </p>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Fitur AI, tanpa batas. Pilih level kamu.
        </h1>
        <p className="max-w-md text-xs text-muted sm:text-sm">
          Mulai dari gratis. Upgrade kalau kamu butuh Tradu & scan lebih lega.
        </p>
      </div>

      {/* Kuota hari ini */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Kuota hari ini</p>
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

      {/* Catatan kecil */}
      <p className="text-center text-[11px] text-muted">
        Soft cap berlaku untuk paket unlimited (Tradu 200/hari, scan 100/hari) biar adil buat semua.
      </p>

      <ActivationSheet
        open={Boolean(activating)}
        tier={activating}
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

      <div className="relative">
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

        <div className="mb-5 flex items-end gap-1.5">
          <span className="num text-3xl font-bold tracking-tight">
            {price === 0 ? "Gratis" : formatIDR(price)}
          </span>
          {price > 0 ? <span className="pb-1 text-xs text-muted">/bulan</span> : null}
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
          onClick={onUpgrade}
          disabled={isCurrent}
        >
          {isCurrent ? (
            <>
              <Check className="size-4" /> Paket aktif
            </>
          ) : price === 0 ? (
            "Tetap di gratis"
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
  onClose,
  onActivated,
}: {
  open: boolean;
  tier: TierId | null;
  onClose: () => void;
  onActivated: (t: TierId) => void;
}) {
  const toast = useToast();
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) setCode("");
  }, [open]);

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
      const data = (await res.json()) as { ok?: boolean; error?: string; days?: number };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal aktivasi");
      }
      await activateTier(targetTier, data.days ?? 30);
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
      description={`${formatIDR(cfg.price)}/bulan · berlaku 30 hari per aktivasi`}
      size="lg"
      footer={
        <Button
          className="w-full"
          size="lg"
          onClick={submit}
          disabled={!code.trim() || busy}
          loading={busy}
        >
          <Crown className="size-4" /> Aktifkan sekarang
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-surface-2/60 p-4">
          <p className="mb-2 text-xs font-medium text-muted">Yang kamu dapet:</p>
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
          hint="Mode uji sebelum pembayaran live. Minta kode ke admin TrackingDuit."
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Masukkan kode aktivasi"
            autoCapitalize="off"
            autoCorrect="off"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </Field>

        <p className="text-[11px] leading-relaxed text-muted">
          Pembayaran QRIS/Midtrans lagi disiapkan. Untuk sekarang, premium diaktifkan lewat kode
          yang dibagikan admin.
        </p>
      </div>
    </Sheet>
  );
}
