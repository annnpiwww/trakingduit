import { parseChatCompletionsResponse } from "@/lib/utils";

export interface AiOcrResponse {
  merchant?: string;
  address?: string;
  date?: string;
  total?: number;
  tax?: number;
  category?: string;
  items?: Array<{
    name: string;
    qty?: number;
    unit?: string;
    price: number;
  }>;
  raw_text: string;
}

export const PROMPT = `Kamu adalah OCR expert untuk struk belanja Indonesia. Baca gambar struk ini dan extract informasi berikut dalam format JSON:

{
  "merchant": "nama toko/merchant (string, atau null jika tidak ada)",
  "address": "alamat merchant/toko (string, atau null jika tidak ada)",
  "date": "tanggal transaksi format YYYY-MM-DD (string, atau null jika tidak ada)",
  "total": "total pembayaran (number dalam rupiah, atau null jika tidak ada)",
  "tax": "pajak/PPN jika ada (number dalam rupiah, atau null jika tidak ada)",
  "category": "kategori belanja (string seperti 'makanan', 'minuman', 'transportasi', 'bahan bakar', 'belanja', 'kesehatan', 'hiburan', 'lainnya', atau null jika tidak jelas)",
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

/** Panggil OpenAI-compatible /chat/completions vision endpoint; throw kalau gagal. */
export async function ocrViaOpenAI(
  apiUrl: string,
  apiKey: string,
  model: string,
  image: string,
  // Model self-hosted (OmniRoute) bisa lambat (10-40s) — jangan bunuh di 30s.
  timeoutMs = 55_000,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
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
        signal: controller.signal,
      });
      // Rate-limit/admission backpressure: retry briefly before giving up.
      if (res.status !== 429 && res.status !== 503) break;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
    res = res!;

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OCR API error ${res.status}: ${body.slice(0, 200)}`);
    }

    const text = await parseChatCompletionsResponse(res);
    if (!text.trim()) throw new Error("OCR API kosong (tidak ada content)");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse model text → AiOcrResponse; strip code fences, ambil objek JSON walau
 * dibungkus prosa/Thinking Process. Kalau JSON-nya gagal/nggak ada, JANGAN
 * throw — balikin raw_text saja (structured kosong). Route bakal tetap balas
 * 200 + text, dan client pakai AI text-nya daripada jatuh ke Tesseract.
 */
export function parseOcrText(text: string): AiOcrResponse {
  const cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : "";
  if (slice) {
    try {
      const parsed = JSON.parse(slice) as Partial<AiOcrResponse>;
      return {
        raw_text: typeof parsed.raw_text === "string" && parsed.raw_text.trim()
          ? parsed.raw_text
          : cleaned,
        ...(parsed.merchant != null ? { merchant: parsed.merchant } : {}),
        ...(parsed.address != null ? { address: parsed.address } : {}),
        ...(parsed.date != null ? { date: parsed.date } : {}),
        ...(parsed.total != null ? { total: parsed.total } : {}),
        ...(parsed.tax != null ? { tax: parsed.tax } : {}),
        ...(parsed.category != null ? { category: parsed.category } : {}),
        ...(Array.isArray(parsed.items) ? { items: parsed.items } : {}),
      };
    } catch {
      // JSON rusak → fall through, pakai teks mentah di bawah.
    }
  }
  return { raw_text: cleaned };
}
