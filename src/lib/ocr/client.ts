"use client";

import type { ParsedReceipt, Receipt } from "../types";
import { reconcileItemTotal } from "./parser";

export interface OcrResult {
  text: string;
  engine: Receipt["engine"];
  parsed?: ParsedReceipt;
}

/** Downscale + re-encode so OCR is fast and the stored data URL stays small. */
export async function prepareImage(file: File, maxSide = 1200, quality = 0.75): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Compress a processed receipt down before storing in IndexedDB — the OCR
 * copy (maxSide 1200) is only needed while reading; a smaller JPEG is plenty
 * for the thumbnail/full preview and avoids storage bloat.
 */
export async function compressReceiptImage(dataUrl: string, maxSide = 900, quality = 0.72): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Gagal memuat gambar"));
    el.src = dataUrl;
  });
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Boost contrast — receipts are low-contrast thermal prints. */
export function preprocess(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return reject(new Error("Canvas tidak tersedia"));
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const boosted = Math.min(255, Math.max(0, (gray - 128) * 1.45 + 128));
        d[i] = d[i + 1] = d[i + 2] = boosted;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => reject(new Error("Gagal memuat gambar"));
    img.src = dataUrl;
  });
}

/** Map AI structured extraction straight into ParsedReceipt, skipping regex. */
function structuredToParsed(s: {
  merchant?: string;
  address?: string;
  date?: string;
  total?: number;
  tax?: number;
  category?: string;
  items?: { name: string; qty?: number; unit?: string; price: number }[];
}): ParsedReceipt {
  return reconcileItemTotal({
    merchant: s.merchant || undefined,
    address: s.address || undefined,
    date: s.date || undefined,
    total: s.total,
    tax: s.tax,
    items: (s.items ?? []).filter((i) => i && i.name && i.price > 0),
    category_hint: s.category?.toLowerCase() || s.merchant?.toLowerCase(),
    confidence: 0.9,
  });
}

/** Server-side AI OCR (ocrgambar-copy via /api/ocr) — structured extraction. */
async function tryAiOcr(dataUrl: string): Promise<OcrResult | null> {
  try {
    // Downscale raw camera photos (10MB+ base64) → ~200KB JPEG so /api/ocr
    // never hits Vercel's 413 Payload Too Large and the AI model stays fast.
    const compressed = await compressReceiptImage(dataUrl, 1000, 0.75);
    const res = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: compressed }),
      // AI self-hosted (OmniRoute) bisa 10-40s — jangan abort di 25s biar
      // nggak kejatuh ke Tesseract padahal AI-nya sehat.
      signal: AbortSignal.timeout(50_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { text?: string; structured?: Record<string, unknown> };
    if (!json.text?.trim()) return null;
    const structured = json.structured as Parameters<typeof structuredToParsed>[0] | undefined;
    // Structured lengkap → pakai hasil AI langsung (merchant/total/items).
    if (structured && (structured.merchant || structured.total || (structured.items?.length ?? 0) > 0)) {
      return { text: json.text, parsed: structuredToParsed(structured), engine: "ai-ocr" };
    }
    // Structured kosong/parsial → AI tetap lebih akurat dari Tesseract;
    // balikin teks mentahnya, parser regex lokal yang lanjut.
    return { text: json.text, engine: "ai-ocr" };
  } catch {
    return null;
  }
}

/**
 * Hybrid scan: AI OCR (ocrgambar-copy) first — best accuracy + structured
 * extraction. Jika gagal, timeout, atau hasilnya tidak lengkap, langsung
 * jatuh ke Tesseract.js di browser sebagai fallback yang selalu tersedia.
 */
export async function runOcr(
  dataUrl: string,
  onProgress?: (ratio: number, stage: string) => void,
): Promise<OcrResult> {
  onProgress?.(0.05, "Mengirim ke OCR AI");

  const ai = await tryAiOcr(dataUrl);
  if (ai) {
    onProgress?.(1, "Selesai");
    return ai;
  }

  onProgress?.(0.15, "Menyiapkan gambar");
  const processed = await preprocess(dataUrl);

  const { createWorker } = await import("tesseract.js");
  onProgress?.(0.25, "Memuat model OCR");
  const worker = await createWorker("ind", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") {
        onProgress?.(0.3 + m.progress * 0.65, "Membaca teks");
      }
    },
  });
  try {
    const { data } = await worker.recognize(processed);
    onProgress?.(1, "Selesai");
    return { text: data.text ?? "", engine: "tesseract" };
  } finally {
    await worker.terminate();
  }
}
