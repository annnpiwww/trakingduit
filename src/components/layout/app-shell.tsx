"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion, type Variants } from "framer-motion";
import { getAnimation } from "@/lib/animations";
import {
  BellDot,
  CalendarClock,
  ChartPie,
  CreditCard,
  HandCoins,
  LayoutGrid,
  ListOrdered,
  LockKeyhole,
  Plus,
  ScanText,
  Settings,
  SunMoon,
  Target,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { useTheme } from "@/lib/theme";
import { db } from "@/lib/db";
import { runBillReminderScan } from "@/lib/repo";
import dynamic from "next/dynamic";
import { Button, Spinner } from "@/components/ui";
import { OnboardingTutorial } from "@/components/onboarding/tutorial";

// Lazy-load: hanya dimuat saat benar-benar dibutuhkan (sheet dibuka / layar terkunci).
const TransactionSheet = dynamic(
  () => import("@/components/transactions/transaction-sheet").then((m) => m.TransactionSheet),
  { ssr: false },
);
const LockScreen = dynamic(() => import("@/components/layout/lock-screen").then((m) => m.LockScreen));

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Beranda", icon: LayoutGrid },
  { href: "/transactions", label: "Transaksi", icon: ListOrdered },
  { href: "/wallets", label: "Dompet", icon: WalletCards },
  { href: "/bills", label: "Tagihan", icon: CalendarClock },
];

const SECONDARY_NAV = [
  { href: "/scan", label: "Scan Nota", icon: ScanText },
  { href: "/debts", label: "Utang Piutang", icon: HandCoins },
  { href: "/budgets", label: "Budget", icon: CreditCard },
  { href: "/goals", label: "Target", icon: Target },
  { href: "/analytics", label: "Analisis", icon: ChartPie },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

const ALL_NAV = [
  ...PRIMARY_NAV,
  ...SECONDARY_NAV,
  { href: "/notifications", label: "Notifikasi", icon: BellDot },
  { href: "/menu", label: "Menu", icon: LayoutGrid },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, profile, lock } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [addOpen, setAddOpen] = React.useState(false);

  const { scrollY } = useScroll();
  const shouldReduceMotion = useReducedMotion();
  const yBg1 = useTransform(scrollY, [0, 1000], [0, shouldReduceMotion ? 0 : 150]);
  const yBg2 = useTransform(scrollY, [0, 1000], [0, shouldReduceMotion ? 0 : -100]);
  const yGrid = useTransform(scrollY, [0, 1000], [0, shouldReduceMotion ? 0 : 40]);

  React.useEffect(() => {
    if (status === "signed-out") router.replace("/login");
  }, [status, router]);

  React.useEffect(() => {
    if (status !== "ready") return;
    void runBillReminderScan();
  }, [status]);

  const unread = useLiveQuery(
    async () => (status === "ready" ? db().notifications.filter((n) => !n.read && !n.deleted).count() : 0),
    [status],
    0,
  );

  if (status === "loading" || status === "signed-out") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-6 text-brand" />
      </div>
    );
  }

  if (status === "locked") return <LockScreen />;

  return (
    <div className="relative flex min-h-dvh overflow-x-hidden">
      {/* Parallax Background Layer */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {/* Layered grid dots pattern moving slower */}
        <motion.div
          style={{ y: yGrid }}
          className="absolute inset-0 bg-grid-pattern opacity-70"
        />
        <motion.div 
          style={{ y: yBg1 }}
          className="absolute -top-[10%] -left-[10%] h-[400px] w-[400px] rounded-full bg-brand/5 blur-[100px] dark:bg-brand/3 sm:h-[600px] sm:w-[600px] sm:blur-[120px]"
        />
        <motion.div 
          style={{ y: yBg2 }}
          className="absolute top-[40%] -right-[10%] h-[350px] w-[350px] rounded-full bg-[rgba(232,96,12,0.05)] blur-[80px] dark:bg-[rgba(232,96,12,0.025)] sm:h-[500px] sm:w-[500px] sm:blur-[100px]"
        />
      </div>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-4 lg:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <BrandMark />
          <div className="leading-tight">
            <p className="text-sm font-semibold">TrackingDuit</p>
            <p className="text-[11px] text-muted">Catat duit, cepat</p>
          </div>
        </Link>

        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
          ))}
          <p className="px-3 pt-4 pb-1 text-[11px] font-medium tracking-wide text-muted uppercase">
            Lainnya
          </p>
          {SECONDARY_NAV.map((item) => (
            <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
          ))}
        </nav>

        <Button className="mt-3 w-full" data-tour="add" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" /> Catat Transaksi
        </Button>

        <button
          onClick={lock}
          className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <span
            className="grid size-7 place-items-center rounded-full text-[11px] font-semibold text-white"
            style={{ background: profile?.avatar_color ?? "#0f9d76" }}
          >
            {(profile?.name ?? "?").slice(0, 1).toUpperCase()}
          </span>
          <span className="flex-1 truncate text-left">{profile?.name}</span>
          {profile?.pin_hash ? <LockKeyhole className="size-3.5" /> : null}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar unread={unread ?? 0} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 lg:px-8 lg:pb-10">
          {children}
        </main>
        <BottomNav pathname={pathname} onAdd={() => setAddOpen(true)} />
      </div>

      <TransactionSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <OnboardingTutorial />
    </div>
  );
}

function BrandMark() {
  return (
    <span className="grid size-9 place-items-center overflow-hidden rounded-xl bg-brand">
      <Image
        src="/icons/logo.png"
        alt="TrakingDuit"
        width={1254}
        height={1254}
        className="size-full object-cover"
      />
    </span>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
        active ? "font-medium text-brand" : "text-muted hover:bg-surface-2 hover:text-fg",
      )}
    >
      {active ? (
        <motion.span
          layoutId="sidebar-pill"
          className="absolute inset-0 rounded-xl bg-brand/10"
          transition={{ type: "spring", stiffness: 600, damping: 35, duration: 0.2 }}
        />
      ) : null}
      <span className="relative">
        <Icon className="size-4" />
      </span>
      <span className="relative">{label}</span>
    </Link>
  );
}

const titleContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.1, ease: "easeIn" },
  },
};

const titleLetterVariants: Variants = {
  hidden: { opacity: 0, y: 5, scale: 0.92 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 700,
      damping: 35,
    },
  },
};

function TopBar({ unread }: { unread: number }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const title = ALL_NAV.find((n) => pathname.startsWith(n.href))?.label ?? "TrackingDuit";
  const characters = React.useMemo(() => title.split(""), [title]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
          <BrandMark />
        </Link>
        <h1 className="flex-1 truncate text-base font-semibold lg:text-lg">
          <AnimatePresence mode="wait" initial={false}>
            {shouldReduceMotion ? (
              <motion.span
                key={title}
                className="inline-block"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
              >
                {title}
              </motion.span>
            ) : (
              <motion.span
                key={title}
                className="inline-flex"
                variants={titleContainerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {characters.map((char, index) => (
                  <motion.span
                    key={`${char}-${index}`}
                    variants={titleLetterVariants}
                    className="inline-block"
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </motion.span>
            )}
          </AnimatePresence>
        </h1>
        <button
          onClick={toggle}
          aria-label="Ganti tema"
          className="rounded-xl p-2 text-muted transition hover:bg-surface-2 hover:text-fg hover:scale-105 active:scale-95"
        >
          <SunMoon className="size-4.5" />
        </button>
        <Link
          href="/notifications"
          aria-label="Notifikasi"
          className="relative rounded-xl p-2 text-muted transition hover:bg-surface-2 hover:text-fg hover:scale-105 active:scale-95"
        >
          <BellDot className="size-4.5" />
          {unread > 0 ? (
            <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-expense px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}

function BottomNav({ pathname, onAdd }: { pathname: string; onAdd: () => void }) {
  const left = PRIMARY_NAV.slice(0, 2);
  const right = [PRIMARY_NAV[3], { href: "/menu", label: "Menu", icon: LayoutGrid }];

  return (
    <nav className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5 pb-1">
        {left.map((item) => (
          <TabItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
        ))}
        <div className="flex justify-center">
          <motion.button
            onClick={onAdd}
            aria-label="Catat transaksi"
            data-tour="add"
            className="-mt-6 grid size-14 place-items-center rounded-full bg-[var(--brand-grad)] text-white shadow-lg shadow-brand/30 transition active:scale-95"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.1 }}
          >
            <Plus className="size-6" />
          </motion.button>
        </div>
        {right.map((item) => (
          <TabItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
        ))}
      </div>
    </nav>
  );
}

function TabItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] transition",
        active ? "text-brand" : "text-muted",
      )}
    >
      {active ? (
        <motion.span
          layoutId="bottom-tab-pill"
          className="absolute -top-0.5 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-brand"
          transition={{ type: "spring", stiffness: 600, damping: 35, duration: 0.2 }}
        />
      ) : null}
      <Icon className="size-5" />
      <span>{label}</span>
    </Link>
  );
}
