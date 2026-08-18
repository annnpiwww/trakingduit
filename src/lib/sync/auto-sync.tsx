"use client";

import * as React from "react";
import { useSession } from "@/lib/session";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase";
import { lastSupabaseSync, syncSupabase } from "./supabase-sync";
import { registerMutationCallback } from "@/lib/repo";

/** Jeda antar sinkron saat semuanya sehat. */
const INTERVAL_MS = 60_000;
/** Backoff eksponensial mulai dari sini saat gagal. */
const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 5 * 60_000;

export type AutoSyncState =
  /** Supabase belum diatur — app jalan lokal saja. */
  | "disabled"
  /** Supabase aktif tapi belum login akun cloud. */
  | "local"
  | "idle"
  | "syncing"
  | "offline"
  | "error";

interface AutoSyncValue {
  state: AutoSyncState;
  lastAt: string | null;
  error: string | null;
  /** Paksa sinkron sekarang (dipakai tombol manual di Settings). */
  syncNow: () => void;
}

const Ctx = React.createContext<AutoSyncValue>({
  state: "disabled",
  lastAt: null,
  error: null,
  syncNow: () => {},
});

export function useAutoSync() {
  return React.useContext(Ctx);
}

export function AutoSyncProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [state, setState] = React.useState<AutoSyncState>(
    isSupabaseConfigured ? "idle" : "disabled",
  );
  const [lastAt, setLastAt] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const running = React.useRef(false);
  const failures = React.useRef(0);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const kickRef = React.useRef<() => void>(() => {});
  const alive = React.useRef(true);

  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  React.useEffect(() => {
    void (async () => {
      const at = await lastSupabaseSync();
      if (alive.current) setLastAt(at);
    })();
  }, []);

  /** Satu putaran sinkron. Mutex `running` mencegah dua putaran tumpang tindih. */
  const run = React.useCallback(async () => {
    if (!isSupabaseConfigured || running.current) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (alive.current) setState("offline");
      return;
    }

    const sb = supabaseBrowser();
    if (!sb) return;

    // Tanpa sesi cloud tidak ada tujuan sinkron — mode lokal, bukan error.
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      if (alive.current) setState("local");
      return;
    }

    running.current = true;
    if (alive.current) setState("syncing");
    try {
      const res = await syncSupabase({ silent: true });
      failures.current = 0;
      if (alive.current) {
        setLastAt(res.at);
        setError(null);
        setState("idle");
      }
    } catch (err) {
      failures.current += 1;
      if (alive.current) {
        setError(err instanceof Error ? err.message : "Sinkron gagal");
        setState("error");
      }
    } finally {
      running.current = false;
    }
  }, []);

  React.useEffect(() => {
    // isSupabaseConfigured konstan build-time; initial state sudah "disabled".
    if (!isSupabaseConfigured) return;
    if (status !== "ready") return;

    let cancelled = false;

    const scheduleNext = (ms: number) => {
      if (cancelled) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void cycle(), ms);
    };

    const cycle = async () => {
      if (cancelled) return;
      await run();
      if (cancelled) return;
      const delay =
        failures.current > 0
          ? Math.min(RETRY_BASE_MS * 2 ** (failures.current - 1), RETRY_MAX_MS)
          : INTERVAL_MS;
      scheduleNext(delay);
    };

    /** Jalankan secepatnya; selalu lewat scheduleNext supaya timer lama dibatalkan. */
    const kick = () => scheduleNext(0);
    kickRef.current = kick;

    registerMutationCallback(() => {
      kick();
    });

    const onOnline = () => {
      failures.current = 0;
      kick();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") kick();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("focus", kick);
    document.addEventListener("visibilitychange", onVisible);

    kick();

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      kickRef.current = () => {};
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", kick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, run]);

  const syncNow = React.useCallback(() => kickRef.current(), []);

  const value = React.useMemo<AutoSyncValue>(
    () => ({ state, lastAt, error, syncNow }),
    [state, lastAt, error, syncNow],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
