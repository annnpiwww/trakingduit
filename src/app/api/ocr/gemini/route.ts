import { NextResponse } from "next/server";
import { ocrRequestSchema, createErrorResponse } from "@/lib/validation";
import { PROMPT, parseOcrText, ocrViaOpenAI } from "@/lib/ocr/prompt";
import type { AiOcrResponse } from "@/lib/ocr/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_MODEL = "gemini-2.0-flash";

/**
 * POST /api/ocr/gemini — vision OCR via an OpenAI-compatible endpoint
 * (configured with OCR_API_URL / OCR_API_KEY / OCR_MODEL). Kalau proxy tidak
 * diset atau gagal (502/503/fetch error), fallback langsung ke Google Gemini
 * API (GEMINI_API_KEY). Return 501 hanya kalau dua-duanya tidak ada.
 */
export async function POST(request: Request) {
  // No auth required: this route only OCRs the uploaded image and touches no
  // user data, so local-only users (no cloud account) must reach it too.

  const ocrApiUrl = process.env.OCR_API_URL;
  const ocrApiKey = process.env.OCR_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if ((!ocrApiUrl || !ocrApiKey) && !geminiKey) {
    return NextResponse.json(
      { error: "OCR_API_URL/OCR_API_KEY atau GEMINI_API_KEY belum diset", fallback: "vision" },
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
          await ocrViaOpenAI(ocrApiUrl, ocrApiKey, process.env.OCR_MODEL || "ocr", image),
        );
      } catch (err) {
        console.error("OCR proxy gagal, fallback ke Gemini:", err instanceof Error ? err.message : err);
      }
    }

    // 2) Fallback ke Google Gemini API langsung
    if (!parsed && geminiKey) {
      parsed = parseOcrText(await ocrViaGemini(image));
      engine = "gemini";
    }

    if (!parsed) {
      return NextResponse.json(
        createErrorResponse("OCR tidak bisa baca teks dari gambar"),
        { status: 502 },
      );
    }

    if (!parsed.raw_text?.trim()) {
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

/** Panggil Google Gemini API langsung (vision), balikin teks mentah; throw kalau gagal. */
async function ocrViaGemini(image: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  const { mimeType, data } = splitDataUrl(image);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT }] },
        contents: [{ role: "user", parts: [{ inlineData: { mimeType, data } }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const dataRes = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = dataRes.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("Gemini kosong (tidak ada kandidat)");
  return text;
}

/** Pecah data URL ("data:image/jpeg;base64,...") jadi mimeType + base64. */
function splitDataUrl(image: string): { mimeType: string; data: string } {
  const comma = image.indexOf(",");
  const header = comma >= 0 ? image.slice(0, comma) : "";
  const mimeType = header.replace(/^data:/, "").split(";")[0] || "image/jpeg";
  const data = comma >= 0 ? image.slice(comma + 1) : image;
  return { mimeType, data };
}
