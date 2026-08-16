"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSetting, setSetting } from "./db";
import { toDateKey } from "./utils";
import { supabaseBrowser } from "./supabase";

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
    tagline: "Cukup untuk mulai mencatat uang",
    price: 0,
    benefits: [
      "Tradu 3 chat per hari",
      "Scan nota 5 kali per hari",
      "Transaksi, budget, target, utang",
      "Sync cloud di semua device kamu",
      "Dashboard + analisis tiap bulan",
    ],
    limits: { tradu: 3, ocr: 5 },
  },
  plus: {
    id: "plus",
    name: "Premium",
    tagline: "Buat kamu yang mulai serius mengatur uang",
    price: 15_000,
    popular: true,
    highlight: "Paling laris",
    benefits: [
      "Tradu 30 chat per hari",
      "Scan nota 15 kali per hari",
      "Badge streak + ekspor data kamu",
      "Download backup & laporan",
      "Semua fitur Standar",
    ],
    limits: { tradu: 30, ocr: 15 },
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Fitur lengkap tanpa batas — buat kamu yang mau makin jago mengatur uang",
    price: 45_000,
    highlight: "Full akses",
    benefits: [
      "Tradu tanpa batas (batas aman 200 pesan)",
      "Scan nota tanpa batas (batas aman 100 kali)",
      "Tema warna premium",
      "Badge eksklusif di profil kamu",
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
  let tier = await getSetting<TierId | null>(TIER_KEY, null);
  const sb = supabaseBrowser();
  if (sb) {
    try {
      const session = (await sb.auth.getSession()).data.session;
      if (session?.user?.user_metadata?.sub_tier) {
        const metaTier = session.user.user_metadata.sub_tier as TierId;
        if (metaTier && (!tier || TIER_ORDER.indexOf(metaTier) > TIER_ORDER.indexOf(tier))) {
          tier = metaTier;
          await setSetting(TIER_KEY, tier);
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (!tier) tier = "free";

  const until = await getTierUntil();
  if (until && Date.parse(until) < Date.now()) {
    await setSetting(TIER_KEY, "free");
    await setSetting(TIER_UNTIL_KEY, null);
    if (sb) {
      void sb.auth.updateUser({ data: { sub_tier: "free", sub_tier_until: null } }).catch(() => {});
    }
    return "free";
  }
  return tier;
}

export async function getTierUntil(): Promise<string | null> {
  let until = await getSetting<string | null>(TIER_UNTIL_KEY, null);
  const sb = supabaseBrowser();
  if (sb && !until) {
    try {
      const session = (await sb.auth.getSession()).data.session;
      if (session?.user?.user_metadata?.sub_tier_until) {
        until = session.user.user_metadata.sub_tier_until;
        await setSetting(TIER_UNTIL_KEY, until);
      }
    } catch {
      /* ignore */
    }
  }
  return until;
}

export async function getUsed(feature: QuotaFeature): Promise<number> {
  const dateKey = toDateKey();
  const dexieKey = usageKey(feature);
  const dexieVal = await getSetting<number>(dexieKey, 0);

  let localVal = 0;
  let metaVal = 0;
  if (typeof window !== "undefined") {
    try {
      const rawUser = localStorage.getItem("td_last_uid");
      if (rawUser) {
        const lsKey = `td_usage_${rawUser}_${feature}_${dateKey}`;
        localVal = parseInt(localStorage.getItem(lsKey) || "0", 10) || 0;
      }
    } catch {
      /* ignore */
    }
  }

  const sb = supabaseBrowser();
  if (sb) {
    try {
      const session = (await sb.auth.getSession()).data.session;
      if (session?.user) {
        const uid = session.user.id;
        if (typeof window !== "undefined") {
          localStorage.setItem("td_last_uid", uid);
        }
        const metaKey = `usage_${feature}_${dateKey.replace(/-/g, "_")}`;
        metaVal = Number(session.user.user_metadata?.[metaKey] ?? 0);
      }
    } catch {
      /* ignore */
    }
  }

  const maxVal = Math.max(dexieVal, localVal, metaVal);
  if (maxVal > dexieVal) {
    await setSetting(dexieKey, maxVal);
  }
  return maxVal;
}

export async function consumeQuota(feature: QuotaFeature): Promise<void> {
  const dateKey = toDateKey();
  const dexieKey = usageKey(feature);
  const used = await getUsed(feature);
  const nextUsed = used + 1;

  // 1. Update Dexie
  await setSetting(dexieKey, nextUsed);

  // 2. Update localStorage & Supabase user_metadata
  const sb = supabaseBrowser();
  if (sb) {
    try {
      const session = (await sb.auth.getSession()).data.session;
      if (session?.user) {
        const uid = session.user.id;
        if (typeof window !== "undefined") {
          localStorage.setItem("td_last_uid", uid);
          localStorage.setItem(`td_usage_${uid}_${feature}_${dateKey}`, String(nextUsed));
        }
        const metaKey = `usage_${feature}_${dateKey.replace(/-/g, "_")}`;
        await sb.auth.updateUser({
          data: {
            [metaKey]: nextUsed,
          },
        });
      }
    } catch (e) {
      console.error("Failed to sync quota to Supabase user_metadata:", e);
    }
  }
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

  const sb = supabaseBrowser();
  if (sb) {
    try {
      await sb.auth.updateUser({
        data: {
          sub_tier: tier,
          sub_tier_until: tier === "free" ? null : until,
        },
      });
    } catch (e) {
      console.error("Failed to sync tier to Supabase:", e);
    }
  }
}

export async function syncQuotaFromUser(user: { id: string; user_metadata?: Record<string, unknown> }): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.setItem("td_last_uid", user.id);
  }
  const meta = user.user_metadata;
  if (!meta) return;

  if (meta.sub_tier) {
    await setSetting(TIER_KEY, meta.sub_tier);
  }
  if (meta.sub_tier_until) {
    await setSetting(TIER_UNTIL_KEY, meta.sub_tier_until);
  }

  const dateKey = toDateKey();
  const dateUnder = dateKey.replace(/-/g, "_");
  const traduKey = `usage_tradu_${dateUnder}`;
  const ocrKey = `usage_ocr_${dateUnder}`;

  if (meta[traduKey] != null) {
    const v = Number(meta[traduKey]) || 0;
    const cur = await getSetting<number>(usageKey("tradu"), 0);
    if (v > cur) await setSetting(usageKey("tradu"), v);
  }
  if (meta[ocrKey] != null) {
    const v = Number(meta[ocrKey]) || 0;
    const cur = await getSetting<number>(usageKey("ocr"), 0);
    if (v > cur) await setSetting(usageKey("ocr"), v);
  }
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
