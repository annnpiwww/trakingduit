import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseFromRequest } from "@/lib/supabase";
import { parseChatCompletionsResponse } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

// Konfigurasi via env saja (jangan commit secret/hardcode):
//   TRADU_API_URL  -> OpenAI-compatible endpoint (mis. OmniRoute via Tailscale Funnel)
//   TRADU_API_KEY  -> API key gateway (kalau gateway tanpa auth, tetap isi dummy)
//   TRADU_MODEL    -> default "auto/best-chat"
//   GEMINI_API_KEY -> fallback langsung ke Google Gemini API
//   GEMINI_TRADU_MODEL -> default "gemini-2.0-flash"
const API_URL = process.env.TRADU_API_URL;
const API_KEY = process.env.TRADU_API_KEY;
const MODEL = process.env.TRADU_MODEL ?? "ollama-cloud/gemma4:31b";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_TRADU_MODEL ?? "gemini-2.0-flash";

export async function POST(req: Request) {
  if (isSupabaseConfigured) {
    const sb = supabaseFromRequest(req);
    if (!sb) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  try {
    const { messages, financialContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    // Format financial details into a concise string for system prompt injection
    const balanceStr = financialContext ? `
Kondisi Keuangan Riel Pengguna Saat Ini:
- Total Saldo Seluruh Dompet: Rp${financialContext.totalBalance.toLocaleString("id-ID")}
- Pemasukan Bulan Ini: Rp${financialContext.income.toLocaleString("id-ID")}
- Pengeluaran Bulan Ini: Rp${financialContext.expense.toLocaleString("id-ID")}
- Selisih (Net): Rp${financialContext.net.toLocaleString("id-ID")}

Top Kategori Pengeluaran Bulan Ini:
${financialContext.topCategories?.map((c: any) => `- ${c.name}: Rp${c.total.toLocaleString("id-ID")} (${Math.round(c.share * 100)}%)`).join("\n") || "- (Belum ada data pengeluaran)"}

Transaksi Terakhir:
${financialContext.recentTransactions?.map((tx: any) => `- ${tx.date}: ${tx.description} (${tx.type === "expense" ? "Keluar" : "Masuk"}) Rp${tx.amount.toLocaleString("id-ID")}`).join("\n") || "- (Belum ada transaksi)"}
` : "";

    const systemPrompt = `Kamu adalah Tradu (Trakingduit), asisten keuangan pribadi berbasis AI yang cerdas, ramah, empatik, dan analitis untuk Gen Z.

Ciri khas bahasamu:
- Menggunakan bahasa Indonesia yang santai, hangat, dan mudah dipahami — gaul ringan, tapi tidak sarkas dan tidak pernah me-roast atau menyalahkan pengeluaran pengguna.
- Selalu ramah, empatik, dan mendukung. Fokus pada solusi, bukan menghakimi.
- Analitis dan taktis: berikan analisis keuangan yang jelas, tips menabung yang konkret, dan saran kelola anggaran yang logis serta bisa langsung dipraktikkan.
- Jawab singkat padat, langsung ke intinya, hindari bertele-tele atau ceramah formal. Maksimal 3-4 kalimat per respons.

${balanceStr}

Dalam percakapan ini, tanggapi pertanyaan pengguna sesuai dengan kepribadian Tradu dan manfaatkan data keuangan di atas jika relevan.`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    if (!API_URL && !GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "TRADU belum dikonfigurasi (TRADU_API_URL / GEMINI_API_KEY kosong)" },
        { status: 503 },
      );
    }

    let reply: string | null = null;

    // 1) Coba OpenAI-compatible proxy dulu
    if (API_URL && API_KEY) {
      try {
        reply = await chatViaOpenAI(apiMessages);
      } catch (err) {
        console.error("TRADU proxy gagal, fallback ke Gemini:", err instanceof Error ? err.message : err);
      }
    }
    // 2) Kalau cuma URL yang ada (gateway tanpa auth), tetep coba pakai key dummy
    else if (API_URL) {
      try {
        reply = await chatViaOpenAI(apiMessages, "dummy-key");
      } catch (err) {
        console.error("TRADU proxy gagal, fallback ke Gemini:", err instanceof Error ? err.message : err);
      }
    }

    // 2) Fallback ke Google Gemini API langsung
    if (!reply && GEMINI_API_KEY) {
      reply = await chatViaGemini(apiMessages);
    }

    if (!reply) {
      return NextResponse.json(
        { error: "Maaf, Koneksi AI Tradu lagi bermasalah nih, coba lagi nanti yaa~" },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

interface ApiMessage {
  role: string;
  content: string;
}

/** Panggil OpenAI-compatible proxy; throw kalau gagal. */
async function chatViaOpenAI(apiMessages: ApiMessage[], apiKey = API_KEY): Promise<string> {
  // Model self-hosted bisa lambat; batal di 50s biar route nggak kena Vercel
  // maxDuration (60s) dan klien nggak nunggu terlalu lama.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50_000);
  try {
    const res = await fetch(`${API_URL}/chat/completions`.replace(/\/+$/, ""), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: apiMessages,
        temperature: 0.8,
        stream: false,
      }),
      signal: controller.signal,
    });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`API Error (${res.status}): ${errorText.slice(0, 500)}`);
  }

  const reply = await parseChatCompletionsResponse(res);
  if (!reply?.trim()) throw new Error("Empty response from AI");
  return reply;
  } finally {
    clearTimeout(timer);
  }
}

/** Panggil Google Gemini API langsung; throw kalau gagal. */
async function chatViaGemini(apiMessages: ApiMessage[]): Promise<string> {
  const { systemInstruction, contents } = toGeminiMessages(apiMessages);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction,
        contents,
        generationConfig: { temperature: 0.8 },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!reply.trim()) throw new Error("Gemini kosong (tidak ada kandidat)");
  return reply;
}

/** Konversi history OpenAI-style (system/user/assistant) ke format Gemini. */
function toGeminiMessages(apiMessages: ApiMessage[]): {
  systemInstruction?: { parts: { text: string }[] };
  contents: { role: "user" | "model"; parts: { text: string }[] }[];
} {
  const systemText = apiMessages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const contents = apiMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));

  return {
    ...(systemText.trim() ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
    contents,
  };
}
