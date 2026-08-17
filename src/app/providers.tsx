"use client";

import * as React from "react";
import { ThemeProvider } from "@/lib/theme";
import { SessionProvider } from "@/lib/session";
import { AutoSyncProvider } from "@/lib/sync/auto-sync";
import { ToastProvider, useToast } from "@/components/ui";
import { registerMutationErrorHandler } from "@/lib/repo";

/** Surface failed Dexie writes (repo mutations) as user-facing error toasts. */
function MutationErrorBridge() {
  const toast = useToast();
  React.useEffect(() => {
    registerMutationErrorHandler((err) => {
      toast(err instanceof Error ? err.message : "Gagal menyimpan data, coba lagi", "error");
    });
  }, [toast]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      }
      return;
    }
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return (
    <ThemeProvider>
      <SessionProvider>
        <ToastProvider>
          <MutationErrorBridge />
          <AutoSyncProvider>{children}</AutoSyncProvider>
        </ToastProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
