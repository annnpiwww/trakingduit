import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseFromRequest } from "@/lib/supabase";
import { insightRequestSchema, createErrorResponse } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

import { normalizeChatEndpoint } from "@/lib/ocr/prompt";

const PROXMOX_TUNNEL_URL = "https://hermesagent.tailcb6f2e.ts.net/v1";
const PROXMOX_TUNNEL_KEY = "sk-23a9722ed5683fbd-6b631a-c1075475";

const API_URL = process.env.AI_API_URL || PROXMOX_TUNNEL_URL;
const API_KEY = process.env.AI_API_KEY || PROXMOX_TUNNEL_KEY;
const MODEL = process.env.AI_MODEL ?? "opencode/deepseek-v4-flash-free";

const SYSTEM = `Kamu penasihat keuangan pribadi untuk pengguna Indonesia.
Kamu menerima ringkasan keuangan bulanan dalam JSON (mata uang Rupiah).
Tugasmu: beri analisis singkat, konkret, dan actionable dalam bahasa Indonesia.

Aturan:
- Sebut angka dari data, jangan mengarang angka yang tidak ada.
- Fokus ke pola yang bisa diubah pengguna bulan depan.
- Nada praktis dan tidak menghakimi. Hindari jargon finansial berat.
- Setiap rekomendasi harus punya langkah konkret, bukan nasihat umum.

Kamu WAJIB mengembalikan output dalam format JSON murni dengan skema berikut tanpa backticks markdown atau teks tambahan di luar JSON:
{
  "summary": "Ringkasan kondisi keuangan bulan ini, maksimal 3 kalimat.",
  "highlights": [
    {
      "title": "Judul temuan, maksimal 8 kata.",
      "detail": "Penjelasan 1-2 kalimat dengan angka.",
      "tone": "positive" | "warning" | "danger" | "neutral"
    }
  ],
  "actions": [
    {
      "action": "Langkah yang bisa langsung dikerjakan.",
      "impact": "Perkiraan dampak, sertakan angka bila bisa."
    }
  ]
}`;

/**
 * POST /api/insight — LLM summary on top of the local rule-based engine.
 * Returns 501 when API Key is unset so the client keeps using the
 * offline insights instead of showing an error.
 */
export async function POST(request: Request) {
  if (isSupabaseConfigured) {
    const sb = supabaseFromRequest(request);
    if (!sb) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  if (!API_URL || !API_KEY) {
    return NextResponse.json(
      { error: "API Key belum diset", fallback: "rules" },
      { status: 501 },
    );
  }

  let payload: unknown;
  try {
    const body = await request.json();
    const validated = insightRequestSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        createErrorResponse(`Invalid request: ${validated.error.issues[0]?.message}`),
        { status: 400 }
      );
    }
    
    payload = validated.data.payload;
  } catch {
    return NextResponse.json(createErrorResponse("Body JSON tidak valid"), { status: 400 });
  }
  if (!payload) return NextResponse.json(createErrorResponse("Field 'payload' wajib"), { status: 400 });

  try {
    const apiRes = await fetch(normalizeChatEndpoint(API_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Ringkasan keuangan bulan ini:\n\n${JSON.stringify(payload, null, 2)}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!apiRes.ok) {
      const errorText = await apiRes.text();
      return NextResponse.json(
        createErrorResponse(`API Error (${apiRes.status}): ${errorText}`),
        { status: 502 }
      );
    }

    const resData = await apiRes.json();
    const content = resData.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        createErrorResponse("Model mengembalikan respons kosong"),
        { status: 502 }
      );
    }

    const cleanJsonText = content.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    const parsedInsight = JSON.parse(cleanJsonText);

    return NextResponse.json({ insight: parsedInsight, model: MODEL });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memanggil model";
    return NextResponse.json(createErrorResponse(message), { status: 502 });
  }
}
