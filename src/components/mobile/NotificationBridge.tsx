"use client";

import * as React from "react";
import { Bell, Sparkles, X, ShieldCheck, CheckCircle2, ChevronRight } from "lucide-react";
import { useToast, Button } from "@/components/ui";
import { useNotificationListener } from "@/lib/capacitor/useNotificationListener";
import { BankNotificationPayload } from "@/lib/capacitor/notification-listener";

export default function NotificationBridge() {
  const toast = useToast();
  const { isSupported, hasPermission, requestPermission, latestNotification } =
    useNotificationListener();
  const handledIdRef = React.useRef<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState<boolean>(false);
  const [requesting, setRequesting] = React.useState<boolean>(false);

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

  // Listen for login_success or tutorial_finished events to open permission modal
  React.useEffect(() => {
    if (!isSupported || hasPermission) return;

    const openPermissionModal = () => {
      if (!hasPermission) {
        setModalOpen(true);
      }
    };

    window.addEventListener("td:login_success", openPermissionModal);
    window.addEventListener("td:tutorial_finished", openPermissionModal);

    // Auto show modal if user is on mobile native app and hasn't granted permission yet
    const onboarded = localStorage.getItem("td.onboarded.v2");
    const modalDismissed = sessionStorage.getItem("td.permission_dismissed");
    if (onboarded && !modalDismissed && !hasPermission) {
      const timer = setTimeout(() => {
        setModalOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("td:login_success", openPermissionModal);
      window.removeEventListener("td:tutorial_finished", openPermissionModal);
    };
  }, [isSupported, hasPermission]);

  const handleGrantPermission = async () => {
    setRequesting(true);
    try {
      await requestPermission();
    } catch {
      toast("Gagal membuka pengaturan, coba buka Pengaturan Android > Akses Notifikasi secara manual", "error");
    } finally {
      setRequesting(false);
      setModalOpen(false);
    }
  };

  const handleClose = () => {
    sessionStorage.setItem("td.permission_dismissed", "1");
    setModalOpen(false);
  };

  if (!modalOpen || hasPermission) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-2xl space-y-4">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-3.5 top-3.5 grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg transition"
          title="Tutup"
        >
          <X className="size-4" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
            <Bell className="size-6 text-brand animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-fg flex items-center gap-1.5">
              Aktifkan Catat Otomatis <Sparkles className="size-4 text-amber-400 fill-amber-400" />
            </h3>
            <p className="text-xs text-muted">Fitur Unggulan Aplikasi Android</p>
          </div>
        </div>

        {/* Body Description */}
        <p className="text-xs leading-relaxed text-muted">
          Aplikasi membutuhkan <strong className="text-fg font-semibold">Izin Akses Notifikasi</strong> agar dapat mendeteksi transaksi m-banking &amp; e-wallet kamu secara otomatis.
        </p>

        {/* 3 Step Instructions */}
        <div className="space-y-2 rounded-xl bg-surface-2 p-3 text-xs">
          <div className="flex items-start gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-brand-fg">
              1
            </span>
            <p className="text-fg">
              Tap <strong className="font-semibold text-brand">Izinkan Akses Notifikasi</strong> di bawah.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-brand-fg">
              2
            </span>
            <p className="text-fg">
              Halaman Pengaturan Android akan terbuka otomatis.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-brand-fg">
              3
            </span>
            <p className="text-fg">
              Aktifkan saklar <strong className="font-semibold text-brand">trakingduit</strong> ke posisi ON.
            </p>
          </div>
        </div>

        {/* Benefits Badges */}
        <div className="flex items-center gap-2 pt-1 text-[11px] text-muted">
          <ShieldCheck className="size-4 shrink-0 text-income" />
          <span>Privasi Aman: Data diproses lokal &amp; dienkripsi.</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2.5 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs"
            onClick={handleClose}
          >
            Nanti Saja
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs gap-1.5 bg-brand text-brand-fg hover:brightness-110 shadow-sm"
            onClick={handleGrantPermission}
            disabled={requesting}
          >
            <CheckCircle2 className="size-4" />
            {requesting ? "Membuka..." : "Izinkan Sekarang"}
          </Button>
        </div>
      </div>
    </div>
  );
}
