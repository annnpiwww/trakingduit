import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseFromRequest } from "@/lib/supabase";
import { parseChatCompletionsResponse } from "@/lib/utils";

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
    const { messages, financialContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    if (messages.some((m: any) => !m || !["user", "assistant"].includes(m.role))) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const ctx = financialContext ?? {};
    const fmt = (n?: number) => (n == null ? "-" : `Rp${Math.round(n).toLocaleString("id-ID")}`);
    const pct = (n?: number) => (n == null ? "-" : `${Math.round(n * 100)}%`);

    const walletsStr = ctx.wallets?.length
      ? ctx.wallets.map((w: any) => `- ${w.name} (${w.type}): ${fmt(w.balance)}`).join("\n")
      : "- Belum ada dompet";

    const budgetsStr = ctx.budgetUsage?.length
      ? ctx.budgetUsage.map((b: any) => `- ${b.name}: ${pct(b.used)} terpakai dari budget`).join("\n")
      : "- Tidak ada budget aktif";

    const billsStr = ctx.bills?.length
      ? ctx.bills.map((b: any) => `- ${b.name}: ${fmt(b.amount)} (Jatuh tempo: ${b.due_date})`).join("\n")
      : "- Tidak ada tagihan aktif";

    const debtsStr = ctx.debts?.length
      ? ctx.debts.map((d: any) => `- ${d.person} [${d.type}]: sisa ${fmt(d.remaining)} dari total ${fmt(d.amount)} (Jatuh tempo: ${d.due_date})`).join("\n")
      : "- Tidak ada utang/piutang";

    const goalsStr = ctx.goals?.length
      ? ctx.goals.map((g: any) => `- ${g.name}: terkumpul ${fmt(g.saved)} dari target ${fmt(g.target)} (${g.progress}%)`).join("\n")
      : "- Tidak ada target tabungan";

    const topCatStr = ctx.topCategories?.length
      ? ctx.topCategories.map((c: any) => `- ${c.name}: ${fmt(c.total)} (${pct(c.share)})`).join("\n")
      : "- Belum ada data pengeluaran";

    const txStr = ctx.recentTransactions?.length
      ? ctx.recentTransactions
          .slice(0, 50)
          .map(
            (tx: any) =>
              `- [${tx.date}] ${tx.description} (${tx.category} via ${tx.wallet}) | ${tx.type === "expense" ? "Pengeluaran" : tx.type === "income" ? "Pemasukan" : "Transfer"}: ${fmt(tx.amount)}`
          )
          .join("\n")
      : "- Belum ada riwayat transaksi";

    const balanceStr = `
DATA KEUANGAN PENGGUNA TERUPDATE (Gunakan data real ini secara presisi dan faktual):

1. TOTAL SALDO & RINCIAN DOMPET:
- Total Saldo Keseluruhan: ${fmt(ctx.totalBalance)}
${walletsStr}

2. RINGKASAN BULAN INI:
- Pemasukan: ${fmt(ctx.income)}
- Pengeluaran: ${fmt(ctx.expense)}
- Sisa Duit (Net): ${fmt(ctx.net)}
- Pengeluaran Bulan Lalu: ${fmt(ctx.lastMonthExpense)}

3. KATEGORI PENGELUARAN TERBESAR BULAN INI:
${topCatStr}

4. STATUS BUDGET KATEGORI:
${budgetsStr}

5. TAGIHAN & CICILAN:
${billsStr}

6. UTANG & PIUTANG:
${debtsStr}

7. TARGET MENABUNG (GOALS):
${goalsStr}

8. RIWAYAT TRANSAKSI TERBARU (Hingga 50 transaksi terbaru lintas tanggal):
${txStr}
`;

    const systemPrompt = `Kamu adalah Tradu, asisten keuangan pribadi yang ramah, hangat, santai, dan peka data untuk pengguna aplikasi TrakingDuit.

GAYA BAHASA & PERSONALITY:
- Gunakan bahasa Indonesia santai, ramah, dan kasual (pakai "aku" dan "kamu").
- DILARANG menggunakan kata-kata kaku/baku berlebihan seperti "proyeksi", "boncos", "anomali", "defisit", atau istilah akuntansi kaku. Tulis dengan gaya bahasa sehari-hari yang enak dibaca.
- Selalu suportif, bersahabat, dan membantu tanpa menghakimi.

PRINSIP ANALISIS & PEKA DATA (SANGAT PENTING):
1. BACA DATA REALITA: Kamu punya akses lengkap ke seluruh data keuangan pengguna di atas (saldo tiap dompet, riwayat transaksi hingga 50 transaksi terbaru, budget, tagihan, utang/piutang, dan target tabungan).
2. JANGAN MEMBUAT ASUMSI NGAWUR ATAU BERANGAN-ANGAN:
   - JANGAN mengalikan pengeluaran harian secara rata/mentah ke akhir bulan (misalnya berasumsi pengeluaran bakal mencapai 10 juta atau 300rb per hari tanpa bukti transaksi nyata).
   - Bedakan pengeluaran besar satu kali (seperti sewa/tagihan/beli barang) dengan pengeluaran harian biasa.
   - Jawab pertanyaan transaksi lama maupun baru secara akurat dari data riwayat transaksi di atas.
3. PRESI PADA ANGKA: Bila memberikan analisis atau saran, selalu sebutkan angka pasti dari data (misal: "Kemarin ada pengeluaran Rp 33.000...").
4. FORMAT: Jawab langsung, padat, dan jelas dalam 2-4 paragraf santai. Tulis teks biasa tanpa format markdown yang ribet.

${balanceStr}

Tanggapi pertanyaan pengguna secara akurat berdasarkan seluruh data keuangan di atas.`;

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
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
        if (!API_URL) throw new Error("API_URL belum diset");
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
      // 429 = rate limit persist (bisa menit), retry gak nolong — langsung
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
