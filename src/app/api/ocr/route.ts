import { NextResponse } from "next/server";
import { ocrRequestSchema, createErrorResponse } from "@/lib/validation";
import { ocrViaOpenAI, parseOcrText, ocrViaGemini } from "@/lib/ocr/prompt";
import type { AiOcrResponse } from "@/lib/ocr/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

// AI OCR endpoint — OpenAI-compatible vision (mis. OmniRoute via Tailscale Funnel).
// Di-set via env (OCR_API_URL / OCR_API_KEY / OCR_MODEL) — jangan hardcode.
const OCR_URL = process.env.OCR_API_URL;
const OCR_API_KEY = process.env.OCR_API_KEY;
const OCR_MODEL = process.env.OCR_MODEL ?? "ollama-cloud/gemma4:31b";
// Chain cadangan, koma-pisah, dicoba berurutan kalau model utama gagal/rate-limit.
const OCR_FALLBACK_MODELS = (
  process.env.OCR_FALLBACK_MODELS ?? "ocrgambar-copy,auto/best-vision,antigravity/gemini-3.6-flash-high"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

// Client abort di 50s (lihat lib/ocr/client.ts) — deadline server harus lebih
// pendek biar respons sempat nyampe ke client sebelum fetch-nya dibatalkan.
// 48s: kalau gemma4 hang di 25s, ocrgambar-copy (butuh ~22s) masih muat di
// sisa 23s, jadi fallback tetap kepake — bukan langsung kolaps ke Tesseract.
const OCR_DEADLINE_MS = 48_000;
const OCR_PER_MODEL_MS = 25_000;
const GEMINI_OCR_TIMEOUT_MS = 20_000;

/**
 * POST /api/ocr — AI OCR via OpenAI-compatible vision endpoint.
 * Chain: OCR_MODEL -> OCR_FALLBACK_MODELS -> Gemini (kalau GEMINI_API_KEY ada).
 * Returns structured { text, structured } on success, or 502 with
 * fallback:"tesseract" so the client drops to Tesseract.js.
 */
export async function POST(request: Request) {
  // No auth required: this route only OCRs the uploaded image and touches no
  // user data, so local-only users (no cloud account) must reach it too.

  let image: string | undefined;
  try {
    const body = await request.json();
    const validated = ocrRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        createErrorResponse(`Invalid request: ${validated.error.issues[0]?.message}`),
        { status: 400 },
      );
    }

    image = validated.data.image;
  } catch {
    return NextResponse.json(createErrorResponse("Body JSON tidak valid"), { status: 400 });
  }
  if (!image) return NextResponse.json(createErrorResponse("Field 'image' wajib diisi"), { status: 400 });
  if (!OCR_URL || !OCR_API_KEY) {
    return NextResponse.json(
      { ...createErrorResponse("OCR_API_URL/OCR_API_KEY belum diatur"), fallback: "tesseract" },
      { status: 501 },
    );
  }

  const deadline = Date.now() + OCR_DEADLINE_MS;
  const errors: string[] = [];
  let parsed: AiOcrResponse | null = null;

  // 1) Chain OpenAI-compatible vision models
  for (const model of [OCR_MODEL, ...OCR_FALLBACK_MODELS]) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    try {
      const text = await ocrViaOpenAI(OCR_URL, OCR_API_KEY, model, image, Math.min(OCR_PER_MODEL_MS, remaining));
      const candidate = parseOcrText(text);
      // Model pertama yang kasih teks = menang; sisanya nggak perlu.
      if (candidate.raw_text?.trim()) {
        parsed = candidate;
        break;
      }
      errors.push(`${model}: teks kosong`);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      const cause = (e as any).cause?.code ?? (e as any).cause?.message ?? "";
      errors.push(`${model}: ${e.message}${cause ? ` (${cause})` : ""}`);
      console.error(`OCR model ${model} gagal:`, e.message, "| cause:", cause);
    }
  }

  // 2) Fallback terakhir ke Google Gemini (vision) — kalau semua model gateway gagal.
  if ((!parsed?.raw_text?.trim()) && process.env.GEMINI_API_KEY) {
    const remaining = deadline - Date.now();
    if (remaining > 0) {
      try {
        parsed = parseOcrText(
          await ocrViaGemini(image, Math.min(GEMINI_OCR_TIMEOUT_MS, remaining)),
        );
      } catch (err) {
        errors.push(`gemini: ${err instanceof Error ? err.message : String(err)}`);
        console.error("OCR Gemini fallback gagal:", err instanceof Error ? err.message : err);
      }
    }
  }

  if (!parsed?.raw_text?.trim()) {
    return NextResponse.json(
      {
        ...createErrorResponse(
          errors.length ? `OCR gagal: ${errors.join(" | ")}` : "OCR tidak bisa baca teks dari gambar",
        ),
        fallback: "tesseract",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    text: parsed.raw_text,
    structured: {
      merchant: parsed.merchant,
      address: parsed.address,
      date: parsed.date,
      total: parsed.total,
      tax: parsed.tax,
      category: parsed.category,
      items: parsed.items || [],
    },
    engine: "ai-ocr",
  });
}
