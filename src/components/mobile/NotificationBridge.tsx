"use client";

import * as React from "react";
import { Bell, Sparkles, X, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui";
import { useNotificationListener } from "@/lib/capacitor/useNotificationListener";
import { BankNotificationPayload } from "@/lib/capacitor/notification-listener";

export default function NotificationBridge() {
  const toast = useToast();
  const { isSupported, hasPermission, requestPermission, latestNotification } =
    useNotificationListener();
  const handledIdRef = React.useRef<string | null>(null);
  const [dismissed, setDismissed] = React.useState<boolean>(false);

  const handleBankNotification = React.useCallback(
    async (payload: BankNotificationPayload) => {
      if (handledIdRef.current === payload.notificationId) return;
      handledIdRef.current = payload.notificationId;

      const formattedAmount = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(payload.amount);

      toast(
        `[${payload.bankName}] ${payload.type === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}: ${formattedAmount} (${payload.description})`,
        "info"
      );

      // Ingest to API auto-transactions
      try {
        await fetch("/api/auto-transactions/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceApp: payload.bankName,
            notificationTitle: `${payload.bankName} Transaksi`,
            notificationText: payload.rawText,
            timestamp: payload.timestamp,
            notificationHash: payload.notificationId,
          }),
        });
      } catch {
        // Silent catch for offline or API errors
      }
    },
    [toast]
  );

  React.useEffect(() => {
    if (latestNotification) {
      handleBankNotification(latestNotification);
    }
  }, [latestNotification, handleBankNotification]);

  if (!isSupported || hasPermission || dismissed) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-brand to-indigo-600 px-4 py-2.5 text-brand-fg shadow-md">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/20 backdrop-blur-sm">
            <Bell className="size-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold flex items-center gap-1 leading-tight text-white">
              Aktifkan Catat Otomatis <Sparkles className="size-3 text-amber-300 fill-amber-300" />
            </p>
            <p className="text-[11px] text-white/80 truncate">
              Izinkan notifikasi bank agar transaksi langsung tercatat
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => requestPermission()}
            className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-brand transition hover:bg-white/90 active:scale-95 shadow-sm"
          >
            Izinkan <ChevronRight className="size-3.5" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="grid size-6 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
            title="Tutup"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
