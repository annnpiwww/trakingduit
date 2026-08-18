"use client";

import * as React from "react";
import { useToast } from "@/components/ui";
import { useNotificationListener } from "@/lib/capacitor/useNotificationListener";
import { BankNotificationPayload } from "@/lib/capacitor/notification-listener";

export default function NotificationBridge() {
  const toast = useToast();
  const { isSupported, hasPermission, latestNotification } = useNotificationListener();
  const handledIdRef = React.useRef<string | null>(null);

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

  if (!isSupported || hasPermission) {
    return null;
  }

  return null;
}
