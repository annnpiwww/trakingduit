"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSetting, setSetting } from "./db";
import { toDateKey } from "./utils";

export type TierId = "free" | "plus" | "pro";
export type QuotaFeature = "tradu" | "ocr";

export interface TierConfig {
  id: TierId;
  name: string;
  tagline: string;
  /** Rupiah per bulan. */
  price: number;
  /** Chip kecil di kartu (mis. "Paling laris"). */
  highlight?: string;
  popular?: boolean;
  benefits: string[];
  /** Kuota per hari. -1 = unlimited (dibatasi soft cap). */
  limits: Record<QuotaFeature, number>;
  softCaps?: Partial<Record<QuotaFeature, number>>;
}

export const TIERS: Record<TierId, TierConfig> = {
  free: {
    id: "free",
    name: "Standar",
    tagline: "Cukup buat mulai catat duit",
    price: 0,
    benefits: [
      "Tradu 3 chat per hari",
      "Scan nota 5 kali per hari",
      "Transaksi, budget, target, utang",
      "Sync cloud di semua device lu",
      "Dashboard + analisis tiap bulan",
    ],
    limits: { tradu: 3, ocr: 5 },
  },
  plus: {
    id: "plus",
    name: "Premium",
    tagline: "Buat yang mulai gas ngatur duit",
    price: 15_000,
    popular: true,
    highlight: "Paling laris",
    benefits: [
      "Tradu 30 chat per hari",
      "Scan nota 15 kali per hari",
      "Badge streak + ekspor data lu",
      "Download backup & laporan",
      "Semua fitur Standar",
    ],
    limits: { tradu: 30, ocr: 15 },
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Gas pol, tanpa batas — buat raja duit",
    price: 45_000,
    highlight: "Full akses",
    benefits: [
      "Tradu tanpa batas (soft cap 200)",
      "Scan nota tanpa batas (soft cap 100)",
      "Tema warna premium",
      "Badge eksklusif di profil lu",
      "Semua fitur Premium",
    ],
    limits: { tradu: -1, ocr: -1 },
    softCaps: { tradu: 200, ocr: 100 },
  },
};

export const TIER_ORDER: TierId[] = ["free", "plus", "pro"];

const TIER_KEY = "sub.tier";
const TIER_UNTIL_KEY = "sub.tierUntil";

function usageKey(feature: QuotaFeature): string {
  return `usage.${feature}.${toDateKey()}`;
}

/** Tier aktif. Kalau langganan kedaluwarsa, otomatis balik ke free. */
export async function getTier(): Promise<TierId> {
  const tier = await getSetting<TierId | null>(TIER_KEY, null);
  if (!tier) return "free";
  const until = await getSetting<string | null>(TIER_UNTIL_KEY, null);
  if (until && Date.parse(until) < Date.now()) {
    await setSetting(TIER_KEY, "free");
    await setSetting(TIER_UNTIL_KEY, null);
    return "free";
  }
  return tier;
}

export async function getTierUntil(): Promise<string | null> {
  return getSetting<string | null>(TIER_UNTIL_KEY, null);
}

export async function getUsed(feature: QuotaFeature): Promise<number> {
  return getSetting<number>(usageKey(feature), 0);
}

export async function consumeQuota(feature: QuotaFeature): Promise<void> {
  const used = await getUsed(feature);
  await setSetting(usageKey(feature), used + 1);
}

/** Limit efektif: kuota tier, atau soft cap untuk tier unlimited. */
export function limitFor(tier: TierId, feature: QuotaFeature): number {
  const t = TIERS[tier];
  const raw = t.limits[feature];
  if (raw !== -1) return raw;
  return t.softCaps?.[feature] ?? 0;
}

export async function activateTier(tier: TierId, days: number): Promise<void> {
  const until = new Date(Date.now() + days * 86_400_000).toISOString();
  await setSetting(TIER_KEY, tier);
  await setSetting(TIER_UNTIL_KEY, tier === "free" ? null : until);
}

export interface QuotaLeft {
  used: number;
  limit: number;
  unlimited: boolean;
  left: number;
}

function quotaLeft(config: TierConfig, used: number, feature: QuotaFeature): QuotaLeft {
  const unlimited = config.limits[feature] === -1;
  const limit = limitFor(config.id, feature);
  return { used, limit, unlimited, left: Math.max(0, limit - used) };
}

export interface SubscriptionState {
  tier: TierId;
  config: TierConfig;
  until: string | null;
  tradu: QuotaLeft;
  ocr: QuotaLeft;
}

/** Hook reaktif: tier + sisa kuota hari ini. Auto-update saat kuota dipakai. */
export function useSubscription(): SubscriptionState {
  const snapshot = useLiveQuery(async () => {
    const [tier, usedTradu, usedOcr, until] = await Promise.all([
      getTier(),
      getUsed("tradu"),
      getUsed("ocr"),
      getTierUntil(),
    ]);
    return { tier, usedTradu, usedOcr, until };
  }, [], null);

  const tier: TierId = snapshot?.tier ?? "free";
  const config = TIERS[tier];
  return {
    tier,
    config,
    until: snapshot?.until ?? null,
    tradu: quotaLeft(config, snapshot?.usedTradu ?? 0, "tradu"),
    ocr: quotaLeft(config, snapshot?.usedOcr ?? 0, "ocr"),
  };
}
