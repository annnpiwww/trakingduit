import { NextResponse } from "next/server";
import { ocrRequestSchema, createErrorResponse } from "@/lib/validation";
import { parseOcrText, ocrViaOpenAI, ocrViaGemini } from "@/lib/ocr/prompt";
import type { AiOcrResponse } from "@/lib/ocr/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/ocr/gemini — legacy vision OCR endpoint (OpenAI-compatible proxy
 * dulu, Gemini fallback). Route utama client adalah /api/ocr — file ini
 * dipertahankan sebagai cadangan manual. Dipakai bersama: ocrViaOpenAI &
 * ocrViaGemini dari lib/ocr/prompt.ts.
 */
export async function POST(request: Request) {
  // No auth required: this route only OCRs the uploaded image and touches no
  // user data, so local-only users (no cloud account) must reach it too.

  const ocrApiUrl = process.env.OCR_API_URL;
  const ocrApiKey = process.env.OCR_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if ((!ocrApiUrl || !ocrApiKey) && !geminiKey) {
    return NextResponse.json(
      { error: "OCR_API_URL/OCR_API_KEY atau GEMINI_API_KEY belum diatur", fallback: "vision" },
      { status: 501 },
    );
  }

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

  try {
    let parsed: AiOcrResponse | null = null;
    let engine = "ai-ocr";

    // 1) Coba OpenAI-compatible proxy dulu
    if (ocrApiUrl && ocrApiKey) {
      try {
        parsed = parseOcrText(
          await ocrViaOpenAI(ocrApiUrl, ocrApiKey, process.env.OCR_MODEL || "ollama-cloud/gemma4:31b", image),
        );
      } catch (err) {
        console.error("OCR proxy gagal, fallback ke Gemini:", err instanceof Error ? err.message : err);
      }
    }

    // 2) Fallback ke Google Gemini API langsung
    if (!parsed?.raw_text?.trim() && geminiKey) {
      parsed = parseOcrText(await ocrViaGemini(image));
      engine = "gemini";
    }

    if (!parsed?.raw_text?.trim()) {
      return NextResponse.json(
        createErrorResponse("OCR tidak bisa baca teks dari gambar"),
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
        items: parsed.items || [],
      },
      engine,
    });
  } catch (err) {
    console.error("OCR route error:", err);
    return NextResponse.json(
      createErrorResponse(`${err instanceof Error ? `${err.name}: ${err.message}` : "OCR request gagal"}`),
      { status: 502 },
    );
  }
}
