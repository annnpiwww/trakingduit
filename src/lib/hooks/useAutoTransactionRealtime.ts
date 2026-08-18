"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "../supabase";

export interface AutoTransactionNotification {
  title: string;
  description: string;
  amount: number;
  formattedAmount: string;
  merchant: string | null;
  sourceApp: string;
  type: string;
  actionUrl: string;
  transaction: Record<string, any>;
}

export function parseAutoTransactionPayload(newTx: Record<string, any>): AutoTransactionNotification {
  const formattedAmount = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(newTx.amount || 0);

  const rawNote = newTx.note || "";
  const sourceApp = rawNote
    ? rawNote.replace(/^Auto-recorded via\s*/i, "").trim()
    : "Bank";

  const merchant = newTx.merchant ? newTx.merchant.trim() : null;
  const merchantText = merchant ? `di ${merchant}` : "";

  const title = "✓ Auto-Catat Transaksi";
  const description = `${formattedAmount}${merchantText ? ` ${merchantText}` : ""} (${sourceApp})`;
  const actionUrl = `/dashboard?edit=${newTx.id}`;

  return {
    title,
    description,
    amount: newTx.amount || 0,
    formattedAmount,
    merchant,
    sourceApp,
    type: newTx.type || "expense",
    actionUrl,
    transaction: newTx,
  };
}

export function useAutoTransactionRealtime(userId?: string) {
  useEffect(() => {
    if (!userId) return;

    const client = supabaseBrowser();
    if (!client) return;

    const channel = client
      .channel(`realtime-auto-transactions-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newTx = payload.new;
          if (newTx && newTx.source === "auto_notification") {
            const notif = parseAutoTransactionPayload(newTx);

            if (typeof window !== "undefined") {
              // Dispatch custom DOM event for in-app Toast listener
              window.dispatchEvent(
                new CustomEvent("auto-transaction-toast", {
                  detail: notif,
                })
              );

              // Browser native Push Notification if granted
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification(notif.title, {
                  body: notif.description,
                  icon: "/icons/icon-192x192.png",
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [userId]);
}
