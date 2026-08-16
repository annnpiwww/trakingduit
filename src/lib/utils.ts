import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names and lets later ones win over earlier ones in the same
 * Tailwind group — without it, a caller's `hidden` loses to a component's own
 * `inline-flex`, since class attribute order does not decide CSS precedence.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** YYYY-MM-DD in local time (not UTC — avoids off-by-one for GMT+7). */
export function toDateKey(d: Date | string = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM */
export function toMonthKey(d: Date | string = new Date()): string {
  return toDateKey(d).slice(0, 7);
}

export function monthRange(monthKey: string): { from: string; to: string } {
  const [y, m] = monthKey.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${monthKey}-01`, to: `${monthKey}-${String(last).padStart(2, "0")}` };
}

export function addMonths(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return toMonthKey(d);
}

const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatIDR(n: number): string {
  return IDR.format(Math.round(n || 0));
}

/** 1.250.000 → compact "1,25 jt" for tight chart labels and tiles. */
export function formatCompactIDR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)} rb`;
  return `${sign}${abs}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n || 0);
}

/** "12500" / "12.500" / "Rp 12.500,00" → 12500 */
export function parseAmount(input: string): number {
  if (!input) return 0;
  let s = String(input).replace(/[^\d.,-]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // whichever separator comes last is the decimal separator
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    const decimals = s.length - lastComma - 1;
    s = decimals === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot > -1) {
    const decimals = s.length - lastDot - 1;
    if (decimals === 3) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

const DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const DAY_FMT = new Intl.DateTimeFormat("id-ID", { weekday: "long" });

export function formatDate(d: string | Date): string {
  return DATE_FMT.format(typeof d === "string" ? new Date(d) : d);
}

export function formatDayLabel(dateKey: string): string {
  const today = toDateKey();
  if (dateKey === today) return "Hari ini";
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (dateKey === toDateKey(y)) return "Kemarin";
  return `${DAY_FMT.format(new Date(dateKey))}, ${formatDate(dateKey)}`;
}

export function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

/** Non-cryptographic PIN hash — local-only guard, not a security boundary. */
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`trackingduit:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const k = key(item);
      (acc[k] ||= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}

export function sum(items: number[]): number {
  return items.reduce((a, b) => a + b, 0);
}

/**
 * Parse a /v1/chat/completions response body into the model's text reply.
 * Tries plain JSON first (choices[0].message.content / content); if that
 * yields nothing, falls back to SSE-stream lines (`data: {"choices":...}`),
 * concatenating delta.content — so it never fails if the router streams
 * despite `stream: false`.
 */
export async function parseChatCompletionsResponse(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

  const extract = (obj: unknown): string => {
    if (!isRecord(obj)) return "";
    const choices = Array.isArray(obj.choices) ? obj.choices : [];
    const choice = isRecord(choices[0]) ? choices[0] : {};
    const message = isRecord(choice.message) ? choice.message : {};
    const delta = isRecord(choice.delta) ? choice.delta : {};
    const contentValue = message.content ?? delta.content;
    const content =
      typeof contentValue === "string"
        ? contentValue
        : Array.isArray(contentValue)
          ? (contentValue as unknown[])
              .map((part: unknown) => {
                if (typeof part === "string") return part;
                if (!isRecord(part)) return "";
                return typeof part.text === "string" ? part.text : "";
              })
              .join("")
          : choice.text ?? obj.content ?? "";
    return typeof content === "string" ? content : "";
  };

  try {
    const fromJson = extract(JSON.parse(text));
    if (fromJson.trim()) return fromJson;
  } catch {
    // Bukan JSON valid — lanjut ke SSE di bawah.
  }

  // SSE stream format: `data: {"choices":[...]}` per baris.
  const parts: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const delta = extract(JSON.parse(payload));
      if (delta) parts.push(delta);
    } catch {
      // Skip baris SSE yang rusak.
    }
  }
  return parts.join("");
}

export function downloadFile(name: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
