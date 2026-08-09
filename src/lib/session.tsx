"use client";

import * as React from "react";
import { db, resetAll, seedIfEmpty } from "./db";
import type { UserProfile } from "./types";
import { hashPin, newId, nowISO } from "./utils";
import { isSupabaseConfigured, supabaseBrowser } from "./supabase";
import { syncSupabase } from "./sync/supabase-sync";

const PROFILE_ID = "me";
const UNLOCK_KEY = "td.unlocked";
const UNLOCK_TIMEOUT = 15 * 60 * 1000; // 15 minutes auto-lock

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
      if (!sb) throw new Error("Supabase belum dikonfigurasi");
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

      // Blok login agar menarik data dari server terlebih dahulu
      if (mode === "login") {
        try {
          await syncSupabase({ silent: true });
        } catch (e) {
          console.error("Gagal menarik data awal pasca login:", e);
        }
      }

      // Pastikan seed dijalankan hanya setelah data cloud ditarik 
      // (jika data cloud memang kosong, seed akan memasukkan default)
      await seedIfEmpty();

      sessionStorage.setItem(UNLOCK_KEY, createUnlockToken());
      setProfile(row);
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
    let synced = true;
    if (sb) {
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
    if (synced) await resetAll();
    setProfile(null);
    setStatus("signed-out");
  }, []);

  const updateProfile = React.useCallback(
    async (patch: Partial<UserProfile>) => {
      const current = await db().profile.get(PROFILE_ID);
      if (!current) return;
      const next = { ...current, ...patch };
      await db().profile.put(next);
      setProfile(next);
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
