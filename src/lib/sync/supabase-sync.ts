"use client";

import type { Table } from "dexie";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stringToUUID } from "../bill-metrics";
import { db, getSetting, setSetting, seedIfEmpty } from "../db";
import { pushNotification } from "../repo";
import { supabaseBrowser } from "../supabase";
import type { Category, Syncable, SyncLog, UserProfile } from "../types";
import { nowISO } from "../utils";

export const LAST_SUPABASE_SYNC = "sync.supabase.lastAt";

/** Local Dexie table ⇄ Postgres table. Receipts stay local (images are heavy). */
const TABLES = [
  { remote: "wallets", local: () => db().wallets },
  { remote: "categories", local: () => db().categories },
  { remote: "transactions", local: () => db().transactions },
  { remote: "budgets", local: () => db().budgets },
  { remote: "saving_goals", local: () => db().goals },
  { remote: "bills", local: () => db().bills },
  { remote: "salaries", local: () => db().salaries },
  { remote: "debts", local: () => db().debts },
] as const;

export interface SupabaseSyncResult {
  pushed: number;
  pulled: number;
  at: string;
}

export interface SupabaseSyncOptions {
  /** Background runs skip the in-app notification so otomatis-sync tidak spam. */
  silent?: boolean;
}

/**
 * Kolom yang pasti ada di remote untuk tiap tabel. Cuma field di daftar ini
 * yang boleh di-push — kolom baru (mis. installment) yang belum sempat di-migrasi
 * ke remote bakal dibuang, jadi PostgREST tidak error "could not find column
 * ... in schema cache" / 400. Honey: allowlist harus di-update manual kalau
 * remote_schema.sql tambah kolom; trigger: error schema cache untuk tabel baru.
 */
const REMOTE_COLUMNS: Record<string, readonly string[]> = {
  wallets: [
    "id", "user_id", "name", "type", "initial_balance", "currency", "color",
    "icon", "note", "archived", "order", "auto_app_identifier", "created_at", "updated_at", "deleted",
  ],
  categories: [
    "id", "user_id", "name", "type", "icon", "color", "is_default", "keywords",
    "created_at", "updated_at", "deleted",
  ],
  transactions: [
    "id", "user_id", "type", "amount", "wallet_id", "to_wallet_id", "category_id",
    "date", "note", "merchant", "tags", "receipt_id", "source",
    "created_at", "updated_at", "deleted",
  ],
  budgets: [
    "id", "user_id", "category_id", "amount", "period", "start_date", "rollover",
    "created_at", "updated_at", "deleted",
  ],
  saving_goals: [
    "id", "user_id", "name", "target_amount", "saved_amount", "deadline",
    "wallet_id", "color", "icon", "archived", "created_at", "updated_at", "deleted",
  ],
  bills: [
    "id", "user_id", "name", "amount", "due_date", "repeat", "category_id",
    "wallet_id", "reminder_days", "last_paid_at", "auto_create_tx", "archived",
    "is_installment", "installment_total", "installment_paid",
    "installment_amount_per_period", "created_at", "updated_at", "deleted",
  ],
  salaries: [
    "id", "user_id", "month", "amount", "created_at", "updated_at", "deleted",
  ],
  debts: [
    "id", "user_id", "person", "type", "amount", "paid_amount", "due_date",
    "note", "wallet_id", "auto_tx", "created_at", "updated_at", "deleted",
  ],
};

const IS_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeUuid(id: string, tableName: string): string {
  if (IS_UUID_REGEX.test(id)) return id;
  console.warn(`[Sync] Non-UUID ID detected in ${tableName}: "${id}". Converting to valid UUID.`);
  return stringToUUID(id);
}

/** Drop device-only fields, saring kolom yang tidak dikenal remote, lalu stamp ownership. */
function toRemote<T extends Syncable>(
  row: T,
  userId: string,
  remoteTable: string,
): Record<string, unknown> {
  const { remote_rev: _remoteRev, ...rest } = row as T & { remote_rev?: string };
  const allowed = REMOTE_COLUMNS[remoteTable];
  const cleaned = allowed
    ? Object.fromEntries(Object.entries(rest).filter(([key]) => allowed.includes(key)))
    : rest;
  if (typeof cleaned.id === "string") {
    cleaned.id = sanitizeUuid(cleaned.id, remoteTable);
  }
  return { ...cleaned, user_id: userId };
}

function toLocal(row: Record<string, unknown>): Record<string, unknown> {
  const { user_id: _userId, ...rest } = row;
  return { ...rest, remote_rev: rest.updated_at };
}

/** Kategori dianggap "lebih berhak" kalau default / id statis, lalu updated_at terbaru. */
function isPreferredCategory(
  a: { id: string; is_default?: number; updated_at?: string },
  b: { id: string; is_default?: number; updated_at?: string },
): boolean {
  const aDef = a.is_default === 1 || a.id.startsWith("ca7e1000") ? 1 : 0;
  const bDef = b.is_default === 1 || b.id.startsWith("ca7e1000") ? 1 : 0;
  if (aDef !== bDef) return aDef > bDef;
  return (a.updated_at ?? "") >= (b.updated_at ?? "");
}

function categoryKey(r: { name?: string; type?: string }): string {
  return `${r.type ?? ""}:${(r.name ?? "").toLowerCase()}`;
}

/** Saring daftar kategori supaya cuma satu survivor per (type, nama) yang dikirim. */
function pickCategorySurvivors<T extends { id: string; is_default?: number; updated_at?: string }>(
  rows: T[],
): T[] {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const key = categoryKey(r as unknown as { name?: string; type?: string });
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }
  const out: T[] = [];
  for (const list of groups.values()) {
    let best = list[0];
    for (const r of list.slice(1)) {
      if (isPreferredCategory(r, best)) best = r;
    }
    out.push(best);
  }
  return out;
}

/* ----------------------------- Profile sync ----------------------------- */

export interface CloudProfile {
  id: string;
  name: string;
  avatar_color: string;
  email?: string | null;
  avatar_url?: string | null;
  updated_at?: string | null;
}

/** Kolom yang di-select dari `profiles`. Kalau `avatar_url` belum ke-migrasi
 *  di remote, PostgREST error — fetch ulang tanpa kolom itu (fallback). */
const PROFILE_COLS = ["id", "name", "avatar_color", "email", "avatar_url", "updated_at"];
const PROFILE_COLS_LEGACY = ["id", "name", "avatar_color", "email", "updated_at"];

export interface CloudProfileResult {
  profile: CloudProfile | null;
  /** false kalau kolom avatar_url belum ada di remote (schema legacy). */
  hasAvatarUrl: boolean;
}

export async function fetchCloudProfile(
  sb: SupabaseClient,
  userId: string,
): Promise<CloudProfileResult> {
  const { data, error } = await sb
    .from("profiles")
    .select(PROFILE_COLS.join(", "))
    .eq("id", userId)
    .maybeSingle();
  if (!error) return { profile: (data as unknown as CloudProfile) ?? null, hasAvatarUrl: true };
  // avatar_url belum ada di schema remote → ulang tanpa kolom itu.
  const retry = await sb
    .from("profiles")
    .select(PROFILE_COLS_LEGACY.join(", "))
    .eq("id", userId)
    .maybeSingle();
  if (retry.error) throw new Error(retry.error.message);
  return { profile: (retry.data as unknown as CloudProfile) ?? null, hasAvatarUrl: false };
}

async function pushCloudProfile(
  sb: SupabaseClient,
  payload: CloudProfile,
): Promise<void> {
  const { error } = await sb.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

/**
 * Profil berubah setelah sync (device lain edit nama/avatar) → kabari React
 * session biar UI langsung pakai versi terbaru tanpa reload.
 */
type ProfileListener = (profile: UserProfile) => void;
const profileListeners = new Set<ProfileListener>();

export function onProfileSynced(listener: ProfileListener): () => void {
  profileListeners.add(listener);
  return () => {
    profileListeners.delete(listener);
  };
}

function emitProfileSynced(profile: UserProfile) {
  for (const listener of profileListeners) listener(profile);
}

/** Patch lokal dianggap lebih baru dari cloud? (last-write-wins). */
function isLocalNewer(localAt: string | undefined, cloudAt: string | null | undefined): boolean {
  const localMs = localAt ? Date.parse(localAt) : 0;
  const cloudMs = cloudAt ? Date.parse(cloudAt) : 0;
  return localMs > cloudMs;
}

/**
 * Tarik kategori dari cloud. Kalau cloud kirim salinan yang kalah "berhak"
 * dibanding kategori lokal (mis. id default vs id acak legacy), buang yang
 * lokal lebih menang supaya duplikat tidak masuk lagi. Kalau cloud yang
 * menang, buang yang kalah lokal + re-point transaksi/budget, lalu simpan.
 */
async function pullCategory(row: { id: string; is_default?: number; updated_at?: string; name?: string; type?: string }): Promise<boolean> {
  const dups = await db()
    .categories.filter((c) => !c.deleted && c.id !== row.id && categoryKey(c) === categoryKey(row))
    .toArray();
  const winners = dups.filter((c) => isPreferredCategory(c, row));
  if (winners.length) return false; // lokal lebih berhak, abaikan row cloud
  const losers = dups.filter((c) => !isPreferredCategory(c, row));
  for (const loser of losers) {
    await db().transactions.where("category_id").equals(loser.id).modify({ category_id: row.id });
    await db().budgets.where("category_id").equals(loser.id).modify({ category_id: row.id });
    await db().categories.delete(loser.id);
  }
  await db().categories.put(row as Category);
  return true;
}

export async function syncSupabase(options: SupabaseSyncOptions = {}): Promise<SupabaseSyncResult> {
  const sb = supabaseBrowser();
  if (!sb) throw new Error("Supabase belum diatur");

  const { data: auth } = await sb.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Belum login ke akun cloud");

  const since = await getSetting<string>(LAST_SUPABASE_SYNC, new Date(0).toISOString());
  const startedAt = nowISO();
  let pushed = 0;
  let pulled = 0;

  try {
    for (const { remote, local } of TABLES) {
      const table = local() as unknown as Table<Syncable, string>;

      /* push local changes */
      let dirty = (await table.filter((r) => !r.remote_rev || r.updated_at > r.remote_rev).toArray()) as Syncable[];
      // kategori: jangan kirim salinan duplikat, cukup survivor per (type, nama)
      if (remote === "categories") {
        dirty = pickCategorySurvivors(dirty as never[]) as unknown as Syncable[];
      }
      if (dirty.length) {
        const CHUNK_SIZE = 100;
        for (let i = 0; i < dirty.length; i += CHUNK_SIZE) {
          const chunk = dirty.slice(i, i + CHUNK_SIZE);
          const { error } = await sb
            .from(remote)
            .upsert(chunk.map((r) => toRemote(r, userId, remote)), { onConflict: "id" });
          if (error) throw new Error(`${remote}: ${error.message}`);
          pushed += chunk.length;

          // Update local remote_rev conditionally to prevent overwriting newer concurrent edits
          for (const r of chunk) {
            const current = await table.get(r.id);
            if (current && current.updated_at === r.updated_at) {
              await table.update(r.id, { remote_rev: r.updated_at });
            }
          }
        }
      }

      /* pull remote changes */
      const { data, error } = await sb
        .from(remote)
        .select("*")
        .eq("user_id", userId)
        .gt("updated_at", since);
      if (error) throw new Error(`${remote}: ${error.message}`);

      for (const raw of data ?? []) {
        const row = toLocal(raw as Record<string, unknown>) as unknown as Syncable;
        // kategori: pull yang menang preferred, buang yang kalah supaya tidak duplikat
        if (remote === "categories") {
          const applied = await pullCategory(row as never);
          if (applied) pulled++;
          continue;
        }
        const existing = await table.get(row.id);
        // last write wins on updated_at
        if (existing && existing.updated_at >= row.updated_at) continue;
        await table.put(row);
        pulled++;
      }
    }

    /* Sync profile (nama, warna) dua arah. Tabel `profiles` id-nya = auth uid
       (beda dari tabel lain yang id-nya uuid acak), jadi ditangani khusus,
       bukan lewat TABLES generic. Avatar_url ikut di-sync (kolom ada di
       remote profiles sejak migration add_avatar_url_column.sql). */
    /* Profile sync sengaja di-try/catch sendiri: kalau gagal (mis. kolom
       avatar_url belum ke-migrasi di remote), jangan bunuh sync tabel data
       — cukup lewati profil & lanjut. */
    try {
      const localProfile = await db().profile.get("me");
      if (localProfile?.supabase_user_id === userId) {
        const { profile: cloudProfile, hasAvatarUrl } = await fetchCloudProfile(sb, userId);
        const localAt = localProfile.updated_at; // undefined = belum ada edit lokal
        if (localAt && isLocalNewer(localAt, cloudProfile?.updated_at)) {
          // User pernah edit nama di device ini & lebih baru → push ke cloud.
          // Jangan timpa avatar cloud dengan null kalau lokal nggak punya.
          await pushCloudProfile(sb, {
            id: userId,
            name: localProfile.name,
            avatar_color: localProfile.avatar_color,
            email: localProfile.email ?? cloudProfile?.email ?? null,
            // undefined → key di-omit saat JSON.stringify, jadi kolom legacy
            // yang belum ada avatar_url nggak bikin PostgREST error.
            avatar_url: hasAvatarUrl
              ? (localProfile.avatar_url ?? cloudProfile?.avatar_url ?? null)
              : undefined,
            updated_at: localAt,
          });
          pushed++;
        } else if (cloudProfile && (!localAt || !isLocalNewer(localAt, cloudProfile.updated_at))) {
          // Device baru / cloud lebih baru → ikutin nama dari cloud, dan kabari
          // session biar UI (greeting, avatar) langsung pakai versi terbaru.
          const cloudPulled: UserProfile = {
            ...localProfile,
            name: cloudProfile.name,
            avatar_color: cloudProfile.avatar_color,
            avatar_url: hasAvatarUrl ? (cloudProfile.avatar_url ?? undefined) : undefined,
            updated_at: cloudProfile.updated_at ?? undefined,
          };
          await db().profile.put(cloudPulled);
          emitProfileSynced(cloudPulled);
          pulled++;
        }
      }
    } catch (profileErr) {
      // Kolom belum ada / koneksi putus → profil skip, tabel data tetap sync.
      console.error("Sync profil dilewati:", profileErr);
    }

    await setSetting(LAST_SUPABASE_SYNC, startedAt);
    // Auto-sync jalan tiap menit; tanpa guard ini syncLogs tumbuh ~1440 baris/hari.
    if (!options.silent || pushed || pulled) {
      await logSync({
        target: "supabase",
        direction: "two-way",
        status: "success",
        pushed,
        pulled,
        message: `${pushed} dikirim, ${pulled} diterima`,
        at: startedAt,
      });
    }
    if ((pushed || pulled) && !options.silent) {
      await pushNotification({
        title: "Sinkron Supabase selesai",
        body: `${pushed} baris dikirim, ${pulled} diterima.`,
        kind: "sync",
      });
    }
    return { pushed, pulled, at: startedAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sinkron gagal";
    await logSync({
      target: "supabase",
      direction: "two-way",
      status: "error",
      pushed,
      pulled,
      message,
      at: nowISO(),
    });
    throw new Error(message);
  }
}

async function logSync(entry: Omit<SyncLog, "id">) {
  await db().syncLogs.add(entry as SyncLog);
}

export async function lastSupabaseSync(): Promise<string | null> {
  const value = await getSetting<string | null>(LAST_SUPABASE_SYNC, null);
  return value && value !== new Date(0).toISOString() ? value : null;
}
