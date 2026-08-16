import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseFromRequest } from "@/lib/supabase";
import { parseChatCompletionsResponse } from "@/lib/utils";
import { checkPersistentRateLimit } from "@/lib/rate-limit";
import { traduRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

// Konfigurasi via env saja (jangan commit secret/hardcode):
//   TRADU_API_URL           -> OpenAI-compatible endpoint (mis. OmniRoute via Tailscale Funnel)
//   TRADU_API_KEY           -> API key gateway (kalau gateway tanpa auth, tetap isi dummy)
//   TRADU_MODEL             -> model utama. Default opencode free (deepseek v4 flash free).
//   TRADU_FALLBACK_MODELS   -> daftar cadangan, koma-pisah, dicoba berurutan kalau model
//                              utama rate-limit/offline (default gemma4 -> best-chat)
//   GEMINI_API_KEY          -> fallback terakhir langsung ke Google Gemini API
//   GEMINI_TRADU_MODEL      -> default "gemini-3.5-flash"
import { normalizeChatEndpoint } from "@/lib/ocr/prompt";

const API_URL = process.env.TRADU_API_URL;
const API_KEY = process.env.TRADU_API_KEY;
const MODEL = process.env.TRADU_MODEL ?? "ollama-cloud/gemma4:31b";
const FALLBACK_MODELS = (
  process.env.TRADU_FALLBACK_MODELS ?? "auto/best-chat,antigravity/gemini-3.6-flash-high"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_TRADU_MODEL ?? "gemini-3.5-flash";

// Timeout hasil tes (Agu 2026): deepseek-free 2-9s, gemma4 2-3s, best-chat ~6s.
// Cold start bisa lebih lama, jadi tiap model dikasih 25s — tapi satu deadline
// global 55s dihitung SEKALI di level route (bukan per-fungsi) memastikan total
// request selalu < Vercel maxDuration (60s), dan satu model yang lambat TIDAK
// memakan jatah model cadangan.
const DEADLINE_MS = 55_000;
const PER_MODEL_MS = 25_000;

export async function POST(req: Request) {
  if (isSupabaseConfigured) {
    const sb = supabaseFromRequest(req);
    if (!sb) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = traduRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validated.error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    const clientIdentifier = req.headers.get("x-real-ip")?.trim()
      || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || "unknown";
    const rateLimit = await checkPersistentRateLimit({
      key: `tradu:${clientIdentifier}`,
      maxRequests: 20,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak pesan. Coba lagi sebentar ya." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        },
      );
    }

    const { messages, financialContext } = validated.data;
    const ctx = financialContext ?? {};
    const fmt = (n?: number) => (n == null ? "-" : `Rp${Math.round(n).toLocaleString("id-ID")}`);
    const pct = (n?: number) => (n == null ? "-" : `${Math.round(n * 100)}%`);

    // Format financial details into a concise string for system prompt injection
    const balanceStr = `
KONDISI KEUANGAN PENGGUNA (data real dari app, jadikan acuan analisis):
- Total Saldo Semua Dompet: ${fmt(ctx.totalBalance)}
- Pemasukan bulan ini: ${fmt(ctx.income)} · Pengeluaran: ${fmt(ctx.expense)} · Sisa: ${fmt(ctx.net)}
- Rasio menabung bulan ini: ${pct(ctx.savingsRate)} · Rata-rata keluar/hari: ${fmt(ctx.avgDailySpend)}
- Proyeksi pengeluaran akhir bulan (laju saat ini): ${fmt(ctx.projectedMonthEnd)}
- Pengeluaran bulan lalu: ${fmt(ctx.lastMonthExpense)} (${ctx.lastMonthDelta == null ? "belum ada data" : ctx.lastMonthDelta >= 0 ? `naik ${fmt(ctx.lastMonthDelta)} dari bulan lalu` : `turun ${fmt(-ctx.lastMonthDelta)} dari bulan lalu`})
- Budget aktif: ${ctx.budgetUsage?.length ? ctx.budgetUsage.map((b) => `${b.name} ${pct(b.used)}`).join(", ") : "tidak ada"}
- Tagihan jatuh tempo ≤7 hari: ${ctx.upcomingBills?.length ? ctx.upcomingBills.map((b) => `${b.name} (${b.daysLeft === 0 ? "hari ini" : `${b.daysLeft} hari lagi`})`).join(", ") : "tidak ada"}

Top Kategori Pengeluaran Bulan Ini:
${ctx.topCategories?.length ? ctx.topCategories.map((c) => `- ${c.name}: ${fmt(c.total)} (${pct(c.share)})`).join("\n") : "- (Belum ada data pengeluaran)"}

Transaksi terbaru:
${ctx.recentTransactions?.length ? ctx.recentTransactions.map((tx) => `- ${tx.date}: ${tx.description} (${tx.type === "expense" ? "Keluar" : "Masuk"}) ${fmt(tx.amount)}`).join("\n") : "- (Belum ada transaksi)"}
`;

    const systemPrompt = `Kamu adalah Tradu, asisten keuangan pribadi yang cerdas, hangat, dan analitis untuk Gen Z Indonesia.

PERSONA & BAHASA:
- Bahasa Indonesia santai, hangat, gaul ringan ("kamu", "duit", "boros") tapi tetap profesional — bukan sarkas, bukan menghakimi, tidak pernah membedah.
- Empatik dan mendukung: fokus solusi, bukan nyalahin. Kalau pengguna boros, bantu cara memperbaikinya, bukan men-judge.
- Jawab singkat padat: 3-5 kalimat per respons, langsung ke inti. Gunakan angka konkret dari data.
- FORMAT PESAN: tulis semua teks polos. JANGAN gunakan markdown seperti **bold**, *italic*, atau \`code\`. Jangan pakai bullet list atau format lain. Cukup teks biasa aja.

CARA BERPIKIR (WAJIB — ini yang bikin kamu pintar):
1. SELALU hitung & pakai angka dari data di atas sebelum menjawab. Contoh: rasio menabung, proporsi kategori, laju harian vs perkiraan.
2. Deteksi anomali dan pola:
   - Pengeluaran > pemasukan → langsung tandai risiko minus.
   - Satu kategori > 30% pengeluaran → sebutkan itu sebagai "sumber boros" dan kasih cara kurangi.
   - Perkiraan akhir bulan > pemasukan → warning habis sebelum gajian.
   - Kategori naik drastis dari bulan lalu → tanyakan/ingatkan.
3. Beri rekomendasi yang SPESIFIK dan BISA DILAKUKAN (angka konkret, bukan nasihat umum):
   - Contoh buruk: "kurangi pengeluaran".
   - Contoh bagus: "Budget GoFood kamu 800rb/bulan (32% pengeluaran). Coba turunin ke 500rb — hemat 300rb/bulan ≈ 3,6 jt/tahun."
4. Kalau data kosong/minim, akui dengan jujur dan arahkan ke fitur ("catat transaksi dulu, nanti aku bisa analisis lebih dalam"). JANGAN mengarang angka.
5. Bedakan fakta dari data vs asumsi: jangan klaim hal yang tidak ada di data.

${balanceStr}

Tanggapi pertanyaan pengguna sesuai persona dan cara berpikir di atas, manfaatkan data keuangan jika relevan.`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    if (!API_URL && !GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "TRADU belum diatur (TRADU_API_URL / GEMINI_API_KEY kosong)" },
        { status: 503 },
      );
    }

    let reply: string | null = null;
    // Detail error terakhir dari tiap jalur, biar pesan ke klien spesifik
    // (mis. "401 API key ditolak") bukan cuma "koneksi bermasalah".
    const errors: string[] = [];

    // Satu deadline global untuk SEMUA jalur AI — sisa waktu Gemini = total
    // minus yang sudah terpakai chain proxy, jadi nggak pernah tembus 60s.
    const deadline = Date.now() + DEADLINE_MS;

    // 1) Coba OpenAI-compatible proxy dulu (chain: MODEL -> FALLBACK_MODELS)
    if (API_URL && API_KEY) {
      try {
        reply = await chatViaOpenAI(apiMessages, API_KEY, deadline);
      } catch (err) {
        errors.push(`proxy: ${err instanceof Error ? err.message : String(err)}`);
        console.error("TRADU proxy gagal, fallback ke Gemini:", err instanceof Error ? err.message : err);
      }
    }
    // 2) Kalau cuma URL yang ada (gateway tanpa auth), tetep coba pakai key dummy
    else if (API_URL) {
      try {
        reply = await chatViaOpenAI(apiMessages, "dummy-key", deadline);
      } catch (err) {
        errors.push(`proxy: ${err instanceof Error ? err.message : String(err)}`);
        console.error("TRADU proxy gagal, fallback ke Gemini:", err instanceof Error ? err.message : err);
      }
    }

    // 3) Fallback terakhir ke Google Gemini API langsung (sisa waktu aja)
    if (!reply && GEMINI_API_KEY) {
      const remaining = deadline - Date.now();
      if (remaining > 0) {
        try {
          reply = await chatViaGemini(apiMessages, remaining);
        } catch (err) {
          errors.push(`gemini: ${err instanceof Error ? err.message : String(err)}`);
          console.error("TRADU Gemini fallback gagal:", err instanceof Error ? err.message : err);
        }
      } else {
        errors.push("gemini: waktu habis sebelum fallback");
      }
    }

    if (!reply) {
      // Pesan user-friendly tetap sama; `detail` teknikal dibawa buat debug
      // (muncul di konsol klien, bukan ditampilkan mentah ke pengguna).
      return NextResponse.json(
        {
          error: "Maaf, Koneksi AI Tradu lagi bermasalah nih, coba lagi nanti yaa~",
          detail: errors.join(" | ") || "tidak ada jalur AI yang dikonfigurasi",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface ApiMessage {
  role: string;
  content: string;
}

/**
 * Panggil OpenAI-compatible proxy dengan chain model: tiap model dapat jatah
 * waktu sendiri (PER_MODEL_MS), tapi total dibatasi deadline global supaya
 * route nggak kena Vercel maxDuration. Gagal di satu model → lanjut model
 * berikutnya. Throw kalau semuanya gagal.
 */
async function chatViaOpenAI(
  apiMessages: ApiMessage[],
  apiKey = API_KEY ?? "",
  deadline = Date.now() + DEADLINE_MS,
): Promise<string> {
  const models = [MODEL, ...FALLBACK_MODELS];
  const failures: string[] = [];

  for (const model of models) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    try {
      return await chatOnce(apiMessages, apiKey, model, Math.min(PER_MODEL_MS, remaining));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`${model}: ${msg}`);
      console.error(`TRADU model ${model} gagal:`, msg);
    }
  }
  throw new Error(failures.join(" | ") || "Semua model gagal");
}

/** Satu percobaan ke satu model, dengan retry singkat untuk 429/503. */
async function chatOnce(
  apiMessages: ApiMessage[],
  apiKey: string,
  model: string,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let res: Response | null = null;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (!API_URL) throw new Error("API_URL belum diatur");
        res = await fetch(normalizeChatEndpoint(API_URL), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: apiMessages,
            // 0.7: cukup kreatif buat persona santai, tapi konsisten & analitis.
            temperature: 0.7,
            stream: false,
          }),
          signal: controller.signal,
        });
      } catch (err) {
        // Network error (fetch failed) — Funnel flaky, transient. Retry singkat.
        lastErr = err;
        if (attempt < 2) await sleepAbortable(1000 * (attempt + 1), controller);
        continue;
      }
      // 429 = rate limit persist (bisa menit), retry nggak nolong — langsung
      // skip ke model fallback. 503 = transient, retry 1x singkat.
      if (res.status === 429) break;
      if (res.status !== 503) break;
      if (attempt < 2) await sleepAbortable(1000, controller);
    }
    if (!res) throw lastErr ?? new Error("fetch failed");

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

/** Tidur tapi tetap bisa di-abort kalau timeout slice habis duluan. */
function sleepAbortable(ms: number, controller: AbortController): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      controller.signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    controller.signal.addEventListener("abort", onAbort, { once: true });
  });
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

/** Panggil Google Gemini API langsung; throw kalau gagal atau timeout. */
async function chatViaGemini(apiMessages: ApiMessage[], timeoutMs = 15_000): Promise<string> {
  const { systemInstruction, contents } = toGeminiMessages(apiMessages);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
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
        signal: controller.signal,
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
  } finally {
    clearTimeout(timer);
  }
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
