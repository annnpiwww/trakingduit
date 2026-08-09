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

/** Map Gemini's structured extraction straight into ParsedReceipt, skipping regex. */
function structuredToParsed(s: {
  merchant?: string;
  address?: string;
  date?: string;
  total?: number;
  tax?: number;
  items?: { name: string; qty?: number; unit?: string; price: number }[];
}): ParsedReceipt {
  return reconcileItemTotal({
    merchant: s.merchant || undefined,
    address: s.address || undefined,
    date: s.date || undefined,
    total: s.total,
    tax: s.tax,
    items: (s.items ?? []).filter((i) => i && i.name && i.price > 0),
    category_hint: s.merchant?.toLowerCase(),
    confidence: 0.9,
  });
}

/** Server-side Gemini Flash — best for thermal receipts, structured extraction. */
async function tryGemini(dataUrl: string): Promise<OcrResult | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("/api/ocr/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    });
    if (res.status === 429) {
      // Middleware rate limit window — back off and retry once before falling back.
      if (attempt < 2) await new Promise((r) => setTimeout(r, 2500));
      continue;
    }
    if (!res.ok) return null;
    const json = (await res.json()) as { text?: string; structured?: Record<string, unknown> };
    if (!json.text?.trim()) return null;
    const structured = json.structured as Parameters<typeof structuredToParsed>[0] | undefined;
    if (structured && (structured.merchant || structured.total || (structured.items?.length ?? 0) > 0)) {
      return { text: json.text, parsed: structuredToParsed(structured), engine: "ai-ocr" };
    }
    return { text: json.text, engine: "ai-ocr" };
  }
  return null;
}

/** Server-side Google Vision — only answers when the API key is configured. */
async function tryVision(dataUrl: string): Promise<OcrResult | null> {
  try {
    const res = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { text?: string };
    if (!json.text?.trim()) return null;
    return { text: json.text, engine: "google-vision" };
  } catch {
    return null;
  }
}

/**
 * Gemini Flash first (best accuracy + structured extraction), Google Vision
 * second, Tesseract in the browser as the always-available fallback.
 */
export async function runOcr(
  dataUrl: string,
  onProgress?: (ratio: number, stage: string) => void,
): Promise<OcrResult> {
  onProgress?.(0.05, "Mengirim ke OCR");
  
  // Try Gemini first (free tier, best for receipts)
  const gemini = await tryGemini(dataUrl);
  if (gemini) {
    onProgress?.(1, "Selesai");
    return gemini;
  }

  // Fall back to Google Vision
  const vision = await tryVision(dataUrl);
  if (vision) {
    onProgress?.(1, "Selesai");
    return vision;
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
