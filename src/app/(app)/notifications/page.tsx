"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  BellOff,
  CalendarClock,
  CheckCheck,
  Info,
  RefreshCw,
  Target,
  TrendingDown,
} from "lucide-react";
import { db } from "@/lib/db";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/repo";
import type { AppNotification } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, Skeleton } from "@/components/ui";

const KIND_ICON = {
  bill: CalendarClock,
  budget: TrendingDown,
  goal: Target,
  sync: RefreshCw,
  info: Info,
} as const;

export default function NotificationsPage() {
  const items = useLiveQuery(
    () => db().notifications.filter((n) => !n.deleted).reverse().sortBy("created_at"),
    [],
  );

  const isLoading = items === undefined;
  const unread = (items ?? []).filter((n) => !n.read).length;

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        <Card className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {unread ? `${unread} belum dibaca` : "Semua notifikasi sudah dibaca"}
        </p>
        {unread ? (
          <Button variant="secondary" size="sm" onClick={() => markAllNotificationsRead()}>
            <CheckCheck className="size-3.5" /> Tandai semua
          </Button>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        {items.length ? (
          <ul className="divide-y divide-border">
            {items.map((n: AppNotification) => {
              const Icon = KIND_ICON[n.kind] ?? Info;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => markNotificationRead(n.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface-2",
                      !n.read && "bg-brand/5",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full",
                        n.kind === "budget"
                          ? "bg-expense/10 text-expense"
                          : n.kind === "bill"
                            ? "bg-warn/10 text-warn"
                            : "bg-brand/10 text-brand",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{n.title}</span>
                        {!n.read ? <Badge tone="brand">Baru</Badge> : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{n.body}</span>
                      <span className="mt-1 block text-[11px] text-muted">
                        {formatDate(n.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={BellOff}
            title="Belum ada notifikasi"
            description="Peringatan budget, pengingat tagihan, dan status sinkronisasi muncul di sini."
          />
        )}
      </Card>
    </div>
  );
}
