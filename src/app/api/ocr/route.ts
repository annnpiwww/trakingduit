import { NextResponse } from "next/server";
import { ocrRequestSchema, createErrorResponse } from "@/lib/validation";
import { ocrViaOpenAI, parseOcrText } from "@/lib/ocr/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

// AI OCR endpoint — OpenAI-compatible vision (mis. OmniRoute via Tailscale Funnel).
// Di-set via env (OCR_API_URL / OCR_API_KEY / OCR_MODEL) — jangan hardcode.
const OCR_URL = process.env.OCR_API_URL;
const OCR_API_KEY = process.env.OCR_API_KEY;
const OCR_MODEL = process.env.OCR_MODEL ?? "ollama-cloud/gemma4:31b";

/**
 * POST /api/ocr — AI OCR via OpenAI-compatible vision endpoint (ocrgambar-copy).
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
      { ...createErrorResponse("OCR_API_URL/OCR_API_KEY belum diset"), fallback: "tesseract" },
      { status: 501 },
    );
  }

  try {
    const parsed = parseOcrText(await ocrViaOpenAI(OCR_URL, OCR_API_KEY, OCR_MODEL, image));

    if (!parsed.raw_text?.trim()) {
      return NextResponse.json(
        { ...createErrorResponse("OCR tidak bisa baca teks dari gambar"), fallback: "tesseract" },
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
  } catch (err) {
    console.error("OCR route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? `${err.name}: ${err.message}` : "OCR request gagal", fallback: "tesseract" },
      { status: 502 },
    );
  }
}
