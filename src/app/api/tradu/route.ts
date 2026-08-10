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

    const ctx = financialContext ?? {};
    const fmt = (n?: number) => (n == null ? "-" : `Rp${Math.round(n).toLocaleString("id-ID")}`);
    const pct = (n?: number) => (n == null ? "-" : `${Math.round(n * 100)}%`);

    // Format financial details into a concise string for system prompt injection
    const balanceStr = `
KONDISI KEUANGAN PENGGUNA (data real dari app, jadikan acuan analisis):
- Total Saldo Semua Dompet: ${fmt(ctx.totalBalance)}
- Pemasukan bulan ini: ${fmt(ctx.income)} · Pengeluaran: ${fmt(ctx.expense)} · Sisa: ${fmt(ctx.net)}
- Rasio nabung bulan ini: ${pct(ctx.savingsRate)} · Rata-rata keluar/hari: ${fmt(ctx.avgDailySpend)}
- Proyeksi pengeluaran akhir bulan (laju saat ini): ${fmt(ctx.projectedMonthEnd)}
- Pengeluaran bulan lalu: ${fmt(ctx.lastMonthExpense)} (${ctx.lastMonthDelta == null ? "belum ada data" : ctx.lastMonthDelta >= 0 ? `naik ${fmt(ctx.lastMonthDelta)} dari bulan lalu` : `turun ${fmt(-ctx.lastMonthDelta)} dari bulan lalu`})
- Budget aktif: ${ctx.budgetUsage?.length ? ctx.budgetUsage.map((b: any) => `${b.name} ${pct(b.used)}`).join(", ") : "tidak ada"}
- Tagihan jatuh tempo ≤7 hari: ${ctx.upcomingBills?.length ? ctx.upcomingBills.map((b: any) => `${b.name} (${b.daysLeft === 0 ? "hari ini" : `${b.daysLeft} hari lagi`})`).join(", ") : "tidak ada"}

Top Kategori Pengeluaran Bulan Ini:
${ctx.topCategories?.length ? ctx.topCategories.map((c: any) => `- ${c.name}: ${fmt(c.total)} (${pct(c.share)})`).join("\n") : "- (Belum ada data pengeluaran)"}

Transaksi Terakhir:
${ctx.recentTransactions?.length ? ctx.recentTransactions.map((tx: any) => `- ${tx.date}: ${tx.description} (${tx.type === "expense" ? "Keluar" : "Masuk"}) ${fmt(tx.amount)}`).join("\n") : "- (Belum ada transaksi)"}
`;

    const systemPrompt = `Kamu adalah Tradu, asisten keuangan pribadi yang cerdas, hangat, dan analitis untuk Gen Z Indonesia.

PERSONA & BAHASA:
- Bahasa Indonesia santai, hangat, gaul ringan ("lo", "duit", "tekor") tapi tetap profesional — bukan sarkas, bukan menghakimi, tidak pernah nge-roast.
- Empatik dan mendukung: fokus solusi, bukan nyalahin. Kalau pengguna boros, bantu cara memperbaikinya, bukan men-judge.
- Jawab singkat padat: 3-5 kalimat per respons, langsung ke inti. Gunakan angka konkret dari data.
- FORMAT PESAN: tulis semua teks polos. JANGAN gunakan markdown seperti **bold**, *italic*, atau \`code\`. Jangan pakai bullet list atau format lain. Cukup teks biasa aja.

CARA BERPIKIR (WAJIB — ini yang bikin kamu pintar):
1. SELALU hitung & pakai angka dari data di atas sebelum menjawab. Contoh: rasio nabung, proporsi kategori, laju harian vs proyeksi.
2. Deteksi anomali dan pola:
   - Pengeluaran > pemasukan → langsung tandai risiko defisit.
   - Satu kategori > 30% pengeluaran → sebutkan itu sebagai "biang tekor" dan kasih cara kurangi.
   - Proyeksi akhir bulan > pemasukan → warning habis sebelum gajian.
   - Kategori naik drastis dari bulan lalu → tanyakan/ingatkan.
3. Beri rekomendasi yang SPESIFIK dan BISA DILAKUKAN (angka konkret, bukan nasihat umum):
   - Contoh buruk: "kurangi pengeluaran".
   - Contoh bagus: "Budget GoFood lo 800rb/bulan (32% pengeluaran). Coba turunin ke 500rb — hemat 300rb/bulan ≈ 3,6 jt/tahun."
4. Kalau data kosong/minim, akui dengan jujur dan arahkan ke fitur ("catat transaksi dulu, nanti aku bisa analisis lebih dalam"). JANGAN mengarang angka.
5. Bedakan fakta dari data vs asumsi: jangan klaim hal yang tidak ada di data.

${balanceStr}

Tanggapi pertanyaan pengguna sesuai persona dan cara berpikir di atas, manfaatkan data keuangan jika relevan.`;

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
        // 0.7: cukup kreatif buat persona santai, tapi konsisten & analitis.
        temperature: 0.7,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`API Error (${res.status}): ${errorText.slice(0, 500)}`);
    }
    const raw = await parseChatCompletionsResponse(res);
    let reply = stripThinkingProcess(raw);
    reply = stripMarkdownFormatting(reply);
    if (!reply?.trim()) throw new Error("Empty response from AI");
    return reply;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Gemma reasoning (google/gemma-4-31b via combo) kadang nempel blok
 * "Thinking Process: ..." sebelum jawaban. Buang bagian itu, sisakan
 * jawaban asli — format yang umum:
 *   Thinking Process:\n\n1. **...**\n\n### Instruction:\n<prompt>\n\n### Response:\n<jawaban>
 */
function stripThinkingProcess(reply: string): string {
  const instructionIdx = reply.indexOf("### Instruction");
  if (instructionIdx >= 0) {
    const after = reply.slice(instructionIdx);
    const responseIdx = after.indexOf("### Response");
    if (responseIdx >= 0) {
      const answer = after.slice(responseIdx + "### Response".length).trim();
      if (answer) return answer;
    }
    const cleaned = after.replace(/^###\s*Instruction.*$/m, "").trim();
    if (cleaned) return cleaned;
  }
  const thinkingIdx = reply.search(/Thinking\s*Process\s*:/i);
  if (thinkingIdx >= 0) {
    // Buang blok thinking (sampai baris kosong pertama setelah list), sisanya jawaban.
    const rest = reply.slice(thinkingIdx);
    const trimmed = rest.replace(/^Thinking\s*Process\s*:[\s\S]*?\n\s*\n/, "").trim();
    if (trimmed) return trimmed;
  }
  return reply;
}

/** Buang format markdown dari reply — bold, italic, code, heading. */
function stripMarkdownFormatting(reply: string): string {
  return reply
    .replace(/\*\*(.+?)\*\*/g, "$1")   // bold **text**
    .replace(/\*(.+?)\*/g, "$1")        // italic *text*
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1") // inline code `text`
    .replace(/^#{1,6}\s+/gm, "")         // heading
    .trim();
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
        generationConfig: { temperature: 0.7 },
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
