"use client";

import * as React from "react";

/** beforeinstallprompt di-type manual (belum ada di lib.dom). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type PWAStatus =
  | { state: "installed" } // sudah jalan sebagai PWA (standalone)
  | { state: "installable" } // browser dukung install otomatis (Chrome/Android/Edge)
  | { state: "ios" } // iOS Safari — harus manual Add to Home Screen
  | { state: "unsupported" }; // desktop lain / nggak bisa install

function detectStatus(): PWAStatus["state"] {
  if (typeof window === "undefined") return "unsupported";
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari standalone (navigator.standalone deprecated tapi masih dipakai)
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (isStandalone) return "installed";
  const ua = navigator.userAgent;
  // iPadOS 13+ ngirim UA "Macintosh" — deteksi lewat maxTouchPoints juga.
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  return "unsupported";
}

/* ----------------------- Singleton store (shared antar instance) ----------------------- */
/* Penting: `beforeinstallprompt` cuma di-fire browser sekali (pas load). Kalau state-nya   */
/* per-instance hook, komponen yang mount belakangan (mis. step install di tour) bakal      */
/* kelewat event-nya. Store module-level bikin semua instance share status yang sama.       */

let deferred: BeforeInstallPromptEvent | null = null;
let status: PWAStatus["state"] = "unsupported";
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((cb) => cb());
}

function subscribe(cb: () => void) {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function getSnapshot() {
  return status;
}

function getServerSnapshot() {
  return "unsupported" as const;
}

if (typeof window !== "undefined") {
  status = detectStatus();
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    status = "installable";
    notify();
  });
  window.addEventListener("appinstalled", () => {
    status = "installed";
    notify();
  });
}

/**
 * Status instalasi PWA + trigger install (shared store).
 * - `installable`: browser nangkep `beforeinstallprompt` → `install()` bakal jalan.
 * - `installed`: sudah jalan standalone (di-home-screen).
 * - `ios`: iOS Safari — nggak ada beforeinstallprompt, panduan manual yang muncul.
 * - `unsupported`: nggak bisa install otomatis (desktop Firefox dsb) — tampilkan panduan.
 */
export function usePWAInstall() {
  const state = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const install = React.useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // Chrome nggak nge-fire beforeinstallprompt lagi sampai reload —
    // kalau dismissed, sembunyiin tombol biar nggak jadi no-op.
    if (outcome === "accepted") status = "installed";
    else status = "unsupported";
    deferred = null;
    notify();
    return outcome === "accepted";
  }, []);

  return { status: state, install };
}
