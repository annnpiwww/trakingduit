import { NextResponse } from "next/server";
import { ocrRequestSchema, createErrorResponse } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AiOcrResponse {
  merchant?: string;
  address?: string;
  date?: string;
  total?: number;
  tax?: number;
  items?: Array<{
    name: string;
    qty?: number;
    unit?: string;
    price: number;
  }>;
  raw_text: string;
}

const PROMPT = `Kamu adalah OCR expert untuk struk belanja Indonesia. Baca gambar struk ini dan extract informasi berikut dalam format JSON:

{
  "merchant": "nama toko/merchant (string, atau null jika tidak ada)",
  "address": "alamat merchant/toko (string, atau null jika tidak ada)",
  "date": "tanggal transaksi format YYYY-MM-DD (string, atau null jika tidak ada)",
  "total": "total pembayaran (number dalam rupiah, atau null jika tidak ada)",
  "tax": "pajak/PPN jika ada (number dalam rupiah, atau null jika tidak ada)",
  "items": [
    {
      "name": "nama item",
      "qty": "jumlah item (number, atau undefined jika tidak ada)",
      "unit": "satuan item (string seperti 'pcs', 'kg', 'gram', 'liter', 'ml', 'botol', 'pack', atau undefined jika tidak ada)",
      "price": "harga item (number dalam rupiah)"
    }
  ],
  "raw_text": "seluruh teks yang terbaca dari struk (string)"
}

PENTING:
- Merchant biasanya di baris paling atas
- Alamat: cari baris dengan kata 'jl.', 'jalan', 'no.', 'rt', 'rw', 'kel', 'kec', atau teks alamat di bagian atas struk (bawah nama toko)
- Cari keyword: "total", "grand total", "total bayar", "jumlah"
- Cari keyword pajak: "ppn", "pb1", "tax", "pajak"
- Format tanggal bisa DD/MM/YYYY, DD-MM-YYYY, atau "13 Mei 2024"
- Angka bisa pakai separator titik (1.000) atau koma (1,000)
- Konversi semua angka ke number (buang separator)
- Items: cari baris dengan format "nama_item harga" atau "qty x nama_item harga"
- Satuan: cari kata seperti pcs, kg, gram, liter, ml, botol, pack setelah qty (misal '2 kg 30.000' → qty 2, unit kg). JANGAN masukkan satuan ke dalam nama item
- PERHATIKAN ANGKA: struk thermal sering buram. Baca setiap digit dengan teliti, bedakan 1/7, 0/8, 3/8, 5/6. Baris 'nama qty x harga' → price = harga per satuan; baris 'nama harga' tanpa qty → price = harga baris
- STRUK SPBU/BBM (PERTALITE, PERTAMAX, SOLAR, dll): format 'NAMA QTY LTR HARGA_PER_LITER TOTAL' (misal 'PERTALITE 4.2 LTR 10.002 42.010'). price = HARGA PER LITER (angka tengah, 10.002), jangan pernah jadikan total baris (42.010) sebagai price satuan
- CROSS-CHECK: kalau struk cuma 1-2 item dan ada total, pastikan qty × price ≈ total (toleransi 2%). Kalau tidak nyambung (misal total 42.010, qty 4.2 → price harusnya ~10.002, BUKAN 15.898), berarti salah baca digit harga satuan — perbaiki
- VALIDASI ARITMATIKA (WAJIB): hitung ulang dari item — sum(qty × price) harus ≈ total akhir. Kalau tidak cocok, berarti ada digit yang salah baca (4↔1, 9↔3, 6↔5, 0↔8, 7↔1) — baca ulang harga item DAN total dengan teliti, lalu perbaiki angka yang benar. Harga item yang wajar (ribuan hingga ratusan ribu), total = jumlah semua item
- Jika tidak yakin, set null (bukan string kosong)
- raw_text harus isi SEMUA teks yang kamu baca dari gambar

Respond HANYA dengan JSON, tanpa markdown code fence atau text lain.`;

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

/** Panggil OpenAI-compatible proxy (retry 429/503), balikin teks mentah; throw kalau gagal. */
async function ocrViaOpenAI(apiUrl: string, apiKey: string, model: string, image: string): Promise<string> {
  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(`${apiUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: false,
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });
    // OmniRoute admission/rate-limit backpressure: retry briefly before falling back.
    if (res.status !== 429 && res.status !== 503) break;
    if (attempt < 2) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  res = res!;

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OCR API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("OCR API kosong (tidak ada content)");
  return text;
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

/** Parse model text → AiOcrResponse; strip code fences, ambil objek JSON walau dibungkus prosa. */
function parseOcrText(text: string): AiOcrResponse {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as AiOcrResponse;
}
