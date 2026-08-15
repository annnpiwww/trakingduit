"use client";

import * as React from "react";
import { db, resetAll, seedIfEmpty } from "./db";
import type { UserProfile } from "./types";
import { hashPin, newId, nowISO } from "./utils";
import { isSupabaseConfigured, supabaseBrowser } from "./supabase";
import { fetchCloudProfile, onProfileSynced, syncSupabase } from "./sync/supabase-sync";
import { syncQuotaFromUser } from "./subscription";

const PROFILE_ID = "me";
const UNLOCK_KEY = "td.unlocked";
const UNLOCK_TIMEOUT = 15 * 60 * 1000; // 15 minutes otomatis-lock

// Simple obfuscation untuk unlock state (bukan enkripsi penuh, tapi lebih baik dari plain "1")
function createUnlockToken(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return btoa(`${timestamp}:${random}`);
}

function validateUnlockToken(token: string | null): boolean {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [timestampStr] = decoded.split(":");
    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    // Token expired after UNLOCK_TIMEOUT
    if (now - timestamp > UNLOCK_TIMEOUT) {
      sessionStorage.removeItem(UNLOCK_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export type SessionStatus = "loading" | "signed-out" | "locked" | "ready";

interface SessionValue {
  status: SessionStatus;
  profile: UserProfile | null;
  supabaseEnabled: boolean;
  /** Local-only account creation / sign-in. */
  signInLocal: (name: string, pin?: string) => Promise<void>;
  signInSupabase: (email: string, password: string, mode: "login" | "register") => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
}

const Ctx = React.createContext<SessionValue | null>(null);

export function useSession() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<SessionStatus>("loading");
  const [profile, setProfile] = React.useState<UserProfile | null>(null);

  const resolve = React.useCallback(async () => {
    const row = await db().profile.get(PROFILE_ID);
    if (!row) {
      setProfile(null);
      setStatus("signed-out");
      return;
    }
    await seedIfEmpty();
    setProfile(row);
    const unlocked = validateUnlockToken(sessionStorage.getItem(UNLOCK_KEY));
    setStatus(row.pin_hash && !unlocked ? "locked" : "ready");
  }, []);

  React.useEffect(() => {
    void resolve();
  }, [resolve]);

  // Cloud profile berubah saat sync (device lain edit nama/avatar) →
  // update React state langsung biar greeting/avatar sinkron tanpa reload.
  React.useEffect(() => {
    return onProfileSynced((p) => {
      setProfile(p);
    });
  }, []);

  const signInLocal = React.useCallback(
    async (name: string, pin?: string) => {
      const existing = await db().profile.get(PROFILE_ID);
      const row: UserProfile = {
        id: PROFILE_ID,
        name: name.trim() || "Pengguna",
        avatar_color: existing?.avatar_color ?? "#0f9d76",
        created_at: existing?.created_at ?? nowISO(),
        email: existing?.email,
        supabase_user_id: existing?.supabase_user_id,
        pin_hash: pin ? await hashPin(pin) : undefined,
      };
      await db().profile.put(row);
      await seedIfEmpty();
      sessionStorage.setItem(UNLOCK_KEY, createUnlockToken());
      setProfile(row);
      setStatus("ready");
    },
    [],
  );

  const signInSupabase = React.useCallback(
    async (email: string, password: string, mode: "login" | "register") => {
      const sb = supabaseBrowser();
      if (!sb) throw new Error("Supabase belum diatur");
      const { data, error } =
        mode === "login"
          ? await sb.auth.signInWithPassword({ email, password })
          : await sb.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      // Kalau konfirmasi email aktif, signUp balik user TANPA session. Tanpa cek ini
      // app terlihat "sudah login" padahal sinkron diam-diam mati (tidak ada sesi).
      if (!data.session) {
        throw new Error(
          "Akun dibuat. Cek email untuk konfirmasi dulu, lalu masuk lagi lewat tab Akun Cloud.",
        );
      }
      const uid = data.user?.id ?? newId();
      const existing = await db().profile.get(PROFILE_ID);
      // JANGAN wipe data lokal saat login. Re-login ke akun yang sama (sesi expired)
      // harusnya merge via sync, bukan reset — kalau reset, data yang belum sempat
      // ter-push (mis. kolom baru yang belum ada di remote) bakal hilang selamanya.
      // Wipe hanya boleh saat GANTI akun cloud (uid berbeda).
      if (existing?.supabase_user_id && existing.supabase_user_id !== uid) {
        await resetAll();
      }
      const row: UserProfile = {
        id: PROFILE_ID,
        name: existing?.name ?? email.split("@")[0],
        email,
        avatar_color: existing?.avatar_color ?? "#0f9d76",
        created_at: existing?.created_at ?? nowISO(),
        pin_hash: existing?.pin_hash,
        supabase_user_id: uid,
      };
      await db().profile.put(row);

      if (data.user) {
        await syncQuotaFromUser(data.user);
      }

      // Blok login agar menarik data dari server terlebih dahulu
      if (mode === "login") {
        try {
          await syncSupabase({ silent: true });
        } catch (e) {
          console.error("Gagal mengambil data awal setelah masuk:", e);
        }
      }

      // Pastikan seed dijalankan hanya setelah data cloud ditarik 
      // (jika data cloud memang kosong, seed akan memasukkan default)
      await seedIfEmpty();

      // Sync profile bisa update nama/warna dari cloud — baca ulang biar
      // UI langsung pakai versi yang paling baru.
      const refreshed = await db().profile.get(PROFILE_ID);
      const finalRow = refreshed ?? row;

      sessionStorage.setItem(UNLOCK_KEY, createUnlockToken());
      setProfile(finalRow);
      setStatus("ready");
    },
    [],
  );

  const unlock = React.useCallback(
    async (pin: string) => {
      if (!profile?.pin_hash) return false;
      const ok = (await hashPin(pin)) === profile.pin_hash;
      if (ok) {
        sessionStorage.setItem(UNLOCK_KEY, createUnlockToken());
        setStatus("ready");
      }
      return ok;
    },
    [profile],
  );

  const lock = React.useCallback(() => {
    sessionStorage.removeItem(UNLOCK_KEY);
    if (profile?.pin_hash) setStatus("locked");
  }, [profile]);

  const signOut = React.useCallback(async () => {
    const sb = supabaseBrowser();
    const cloudUser = profile?.supabase_user_id;
    let synced = true;
    if (sb && cloudUser) {
      try {
        // Sync one last time before signing out and clearing local DB
        await syncSupabase();
      } catch (e) {
        console.error("Failed to sync before signing out:", e);
        // Jangan wipe kalau sync gagal (mis. offline) — data lokal tetap ada,
        // biar nggak hilang sebelum sempat ke cloud.
        synced = false;
      }
      await sb.auth.signOut();
    }
    sessionStorage.removeItem(UNLOCK_KEY);
    if (cloudUser && synced) {
      // Data aman di cloud → wipe cache lokal biar akun lain nggak lihat data lama.
      await resetAll();
    } else {
      // Mode lokal-only / sync gagal: jangan hapus data — itu satu-satunya salinan.
      // Cukup lepas profil biar balik ke layar login, data tabel tetap utuh.
      await db().profile.delete(PROFILE_ID);
    }
    setProfile(null);
    setStatus("signed-out");
  }, [profile]);

  const updateProfile = React.useCallback(
    async (patch: Partial<UserProfile>) => {
      const current = await db().profile.get(PROFILE_ID);
      if (!current) return;
      const next = { ...current, ...patch, updated_at: nowISO() };
      await db().profile.put(next);
      setProfile(next);
      // Push nama/warna ke cloud biar device lain ikut (last-write-wins pakai updated_at).
      if (next.supabase_user_id) {
        const sb = supabaseBrowser();
        if (sb) {
          try {
            // Guard: kalau cloud ternyata lebih baru dari versi lokal yg LAMA,
            // jangan push — biar nggak nimpa nama yang diedit di device lain
            // (lost-update race: edit warna di device yg namanya stale).
            const prevMs = current.updated_at ? Date.parse(current.updated_at) : 0;
            const { profile: cloudProfile, hasAvatarUrl } = await fetchCloudProfile(
              sb,
              next.supabase_user_id,
            );
            const cloudMs = cloudProfile?.updated_at ? Date.parse(cloudProfile.updated_at) : 0;
            // Cloud-wins cuma kalau device ini sudah pernah sync (prevMs > 0) dan
            // cloud berubah setelah base lokal terakhir. Device baru yang belum
            // sempat sync (prevMs = 0) → edit lokal tetap di-push (LWW normal).
            if (prevMs > 0 && cloudMs > prevMs && cloudProfile) {
              // Cloud lebih baru dari base lokal → adopsi versi cloud ke Dexie +
              // session, biar edit stale di device ini nggak nge-overwrite nama/
              // avatar yang diedit di device lain (dan sync berikutnya nggak
              // nge-push ulang versi lokal yang sudah kalah).
              const adopted: UserProfile = {
                ...next,
                name: cloudProfile.name,
                avatar_color: cloudProfile.avatar_color,
                avatar_url: hasAvatarUrl ? (cloudProfile.avatar_url ?? undefined) : undefined,
                updated_at: cloudProfile.updated_at ?? next.updated_at,
              };
              await db().profile.put(adopted);
              setProfile(adopted);
              return;
            }
            if (cloudMs <= prevMs) {
              // avatar_url fallback ke cloud: edit nama aja jangan null-kan
              // avatar yang di-upload di device lain. Key di-omit kalau kolom
              // belum ada di remote (schema legacy) biar PostgREST nggak error.
              const payload: Record<string, unknown> = {
                id: next.supabase_user_id,
                name: next.name,
                avatar_color: next.avatar_color,
                email: next.email,
                updated_at: next.updated_at,
              };
              if (hasAvatarUrl) payload.avatar_url = next.avatar_url ?? cloudProfile?.avatar_url ?? null;
              await sb.from("profiles").upsert(payload, { onConflict: "id" });
            }
          } catch (e) {
            console.error("Gagal mengirim profil ke cloud:", e);
          }
        }
      }
    },
    [],
  );

  const value: SessionValue = {
    status,
    profile,
    supabaseEnabled: isSupabaseConfigured,
    signInLocal,
    signInSupabase,
    unlock,
    lock,
    signOut,
    updateProfile,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
