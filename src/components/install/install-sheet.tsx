"use client";

import * as React from "react";
import { MonitorSmartphone } from "lucide-react";
import { Sheet } from "@/components/ui";
import { InstallPrompt } from "./install-prompt";

/** Sheet panduan install PWA — dipakai dari halaman Menu. */
export function InstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Install Aplikasi"
      description="Pasang TrackingDuit di home screen"
    >
      <div className="space-y-4 pt-1">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand">
          <MonitorSmartphone className="size-7" />
        </div>
        <ul className="space-y-2">
          <Benefit title="Buka lebih cepat" desc="Langsung kebuka dari home screen, tanpa buka browser dulu." />
          <Benefit title="Bisa dipakai offline" desc="Catat transaksi walau lagi nggak ada sinyal." />
          <Benefit title="Kaya app beneran" desc="Tampilan fullscreen, nggak ada address bar browser." />
        </ul>
        <InstallPrompt />
      </div>
    </Sheet>
  );
}

function Benefit({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted">{desc}</p>
      </div>
    </li>
  );
}
