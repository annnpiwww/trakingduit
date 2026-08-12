"use client";

import * as React from "react";
import { motion, AnimatePresence, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { X, Eye, EyeOff } from "lucide-react";
import { sheetOverlay, sheetContent, toastPreset, getAnimation } from "@/lib/animations";

/* ----------------------------------- Card ---------------------------------- */

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-xl bg-surface shadow-(--shadow-card) transition-shadow duration-200", className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-4 pt-4", className)}>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ---------------------------------- Button --------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-fg hover:brightness-110 shadow-sm shadow-brand/20",
  secondary: "bg-surface-2 text-fg hover:bg-border/60 border border-border",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
  danger: "bg-expense text-expense-fg hover:brightness-110",
  outline: "border border-border text-fg hover:bg-surface-2",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-sm gap-2",
  icon: "h-9 w-9",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  children,
  ...props
}: Omit<HTMLMotionProps<"button">, "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  const isDisabled = disabled || loading;
  return (
    <motion.button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-xl font-medium transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={isDisabled}
      whileHover={!isDisabled ? getAnimation({ scale: 1.01 }) : undefined}
      whileTap={!isDisabled ? getAnimation({ scale: 0.98 }) : undefined}
      transition={{ duration: 0.1 }}
      {...props}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {loading ? (
          <motion.span
            key="spinner"
            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
            transition={{ duration: 0.2 }}
            className="inline-flex"
          >
            <Spinner className="size-4" />
          </motion.span>
        ) : (
          <motion.span
            key="content"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="inline-flex items-center justify-center gap-2"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        className ?? "size-4",
      )}
      role="status"
      aria-label="Memuat"
    />
  );
}

/* ---------------------------------- Fields --------------------------------- */

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label ? (
        <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      ) : null}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-expense">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

const CONTROL =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "min-h-20 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select className={cn(CONTROL, "appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}

/* ---------------------------------- Badge ---------------------------------- */

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.ComponentProps<"span"> & { tone?: "neutral" | "income" | "expense" | "warn" | "brand" }) {
  const tones = {
    neutral: "bg-surface-2 text-muted border-border",
    income: "bg-income/10 text-income border-income/20",
    expense: "bg-expense/10 text-expense border-expense/20",
    warn: "bg-warn/10 text-warn border-warn/20",
    brand: "bg-brand/10 text-brand border-brand/20",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/* ---------------------------------- Sheet ---------------------------------- */

/** Bottom sheet on mobile, centered dialog on desktop. */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg";
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
            variants={getAnimation(sheetOverlay)}
            initial="hidden"
            animate="visible"
            exit="exit"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-(--shadow-pop) sm:rounded-2xl",
              size === "lg" ? "sm:max-w-2xl" : "sm:max-w-md",
            )}
            variants={getAnimation(sheetContent)}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h3 className="text-base font-semibold">{title}</h3>
                {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
              </div>
              <button
                onClick={onClose}
                className="-mr-1 rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
                aria-label="Tutup"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="safe-b flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer ? (
              <div className="safe-b border-t border-border bg-surface px-5 py-3">{footer}</div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------- EmptyState -------------------------------- */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={cn("flex flex-col items-center px-6 py-12 text-center", className)}
      initial={getAnimation({ opacity: 0, y: 8 })}
      animate={getAnimation({ opacity: 1, y: 0 })}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {Icon ? (
        <div className="mb-3 rounded-2xl border border-border bg-surface-2 p-3 text-muted">
          <Icon className="size-6" />
        </div>
      ) : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="mt-1 max-w-xs text-xs text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </motion.div>
  );
}

/* --------------------------------- Progress -------------------------------- */

export function Progress({
  value,
  tone = "brand",
  className,
}: {
  value: number;
  tone?: "brand" | "expense" | "warn" | "income";
  className?: string;
}) {
  const colors = {
    brand: "bg-brand",
    expense: "bg-expense",
    warn: "bg-warn",
    income: "bg-income",
  } as const;
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}>
      <motion.div
        className={cn("h-full rounded-full", colors[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </div>
  );
}

/* ---------------------------------- Tabs ----------------------------------- */

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-border bg-surface-2 p-1 text-xs font-medium",
        className,
      )}
      role="tablist"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative flex-1 cursor-pointer rounded-md px-3 py-1.5 transition",
            value === o.value ? "text-fg" : "text-muted hover:text-fg",
          )}
        >
          {value === o.value ? (
            <motion.span
              layoutId={`segmented-${o.value}`}
              className="absolute inset-0 rounded-md bg-surface shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          ) : null}
          <span className="relative z-10">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------- Toast ---------------------------------- */

type Toast = { id: string; message: string; tone: "info" | "success" | "error" };
const ToastContext = React.createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function useToast() {
  return React.useContext(ToastContext);
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [isHovered, setIsHovered] = React.useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const remainingRef = React.useRef<number>(3200);
  const startTimeRef = React.useRef<number>(Date.now());

  React.useEffect(() => {
    if (isHovered) {
      if (timerRef.current) clearTimeout(timerRef.current);
      remainingRef.current -= Date.now() - startTimeRef.current;
    } else {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        onDismiss(toast.id);
      }, Math.max(remainingRef.current, 500));
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isHovered, toast.id, onDismiss]);

  return (
    <motion.div
      layout
      variants={getAnimation(toastPreset)}
      initial="hidden"
      animate="visible"
      exit="exit"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "pointer-events-auto flex items-center justify-between gap-3 max-w-sm w-full rounded-xl border px-4 py-2.5 text-sm shadow-lg transition-all",
        toast.tone === "success"
          ? "border-income/30 bg-income/10 text-income"
          : toast.tone === "error"
            ? "border-expense/30 bg-expense/10 text-expense"
            : "border-brand/30 bg-brand/10 text-brand",
      )}
    >
      <span className="flex-1 font-medium">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="rounded-md p-1 opacity-70 transition hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
        aria-label="Tutup"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, tone }];
      if (next.length > 3) {
        return next.slice(next.length - 3);
      }
      return next;
    });
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/* --------------------------------- Skeleton -------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-2", className)} />;
}

/* ------------------------------- BalanceCard ------------------------------- */

/** BRImo-style gradient balance hero. White text on brand gradient. */
export function BalanceCard({
  label,
  value,
  hidden,
  onToggleHide,
  sub,
  watermark,
  chip,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hidden?: boolean;
  onToggleHide?: () => void;
  sub?: React.ReactNode;
  /** Oversized brand glyph in the background (mis. "Rp"). */
  watermark?: React.ReactNode;
  /** Pill kecil di header row (mis. mood duit). */
  chip?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,#003d7a,#0072c6)] p-5 text-white shadow-lg shadow-brand/30 sm:p-6",
        className,
      )}
      initial={getAnimation({ opacity: 0, y: 8 })}
      animate={getAnimation({ opacity: 1, y: 0 })}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Glass sheen + depth rings (dekoratif, bukan interaktif) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),transparent_42%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-20 -bottom-28 size-72 rounded-full border border-white/10"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 -bottom-6 size-32 rounded-full border border-white/[0.07]"
      />
      {watermark ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-2 bottom-0 select-none text-[7.5rem] leading-none font-black text-white/[0.06]"
        >
          {watermark}
        </span>
      ) : null}
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-[13px] font-medium text-white/85">
          <span className="flex min-w-0 items-center gap-2">
            {label}
            {onToggleHide ? (
              <motion.button
                type="button"
                onClick={onToggleHide}
                aria-label={hidden ? "Liat nominal" : "Sembunyiin nominal"}
                className="text-white/80 transition hover:text-white"
                whileTap={{ scale: 0.9 }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={hidden ? "off" : "on"}
                    className="inline-flex"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.1 }}
                  >
                    {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            ) : null}
          </span>
          {chip ? <span className="min-w-0 shrink-0">{chip}</span> : null}
        </div>
        <p className="num mt-1 text-2xl sm:text-4xl lg:text-5xl leading-tight font-bold tracking-tight truncate">{value}</p>
        {sub ? <div className="mt-2.5 text-xs text-white/80">{sub}</div> : null}
      </div>
    </motion.div>
  );
}

/* ------------------------------ DonutProgress ------------------------------ */

/** SVG donut with center label. BRImo budget ring. */
export function DonutProgress({
  value,
  size = 148,
  strokeWidth = 14,
  centerLabel,
  centerSub,
  tone = "brand",
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  centerLabel: React.ReactNode;
  centerSub?: React.ReactNode;
  tone?: "brand" | "expense" | "warn";
  className?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const tones = {
    brand: "var(--brand)",
    expense: "var(--expense)",
    warn: "var(--warn)",
  } as const;
  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${Math.round(pct)}%`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tones[tone]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-2xl font-bold tracking-tight">{centerLabel}</span>
        {centerSub ? <span className="mt-0.5 text-[11px] text-muted">{centerSub}</span> : null}
      </div>
    </div>
  );
}

/* --------------------------------- MenuTile -------------------------------- */

/** Pastel quick-menu tile, 4-col grid friendly. */
export function MenuTile({
  icon: Icon,
  label,
  tone = "brand",
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone?: "brand" | "income" | "expense" | "warn" | "accent";
  className?: string;
}) {
  const tones = {
    brand: "bg-brand/10 text-brand",
    income: "bg-income/10 text-income",
    expense: "bg-expense/10 text-expense",
    warn: "bg-warn/10 text-warn",
    accent: "bg-accent/8 text-accent",
  } as const;
  return (
    <motion.div
      className={cn(
        "group flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-border bg-surface p-3 shadow-(--shadow-card) transition-all duration-200 hover:border-border/80 hover:shadow-(--shadow-hover)",
        className,
      )}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
    >
      <span
        className={cn(
          "grid size-11 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105",
          tones[tone],
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="text-[11px] font-semibold text-fg sm:text-xs">{label}</span>
    </motion.div>
  );
}
