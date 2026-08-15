import { NextRequest, NextResponse } from "next/server";

/**
 * Pengaktifan premium via kode (mode uji sebelum payment live).
 *
 * Dipakai sementara sampai integrasi Midtrans/QRIS selesai: admin kasih kode
 * (env PREMIUM_ACTIVATION_CODE) ke tester, user masukin di halaman Premium,
 * route ini verifikasi dan balikin tier + durasi. Client yang menulis tier
 * ke Dexie (lihat activateTier di lib/subscription).
 *
 * honey: kode statis = rawan bocor; ganti dengan webhook Midtrans sebelum
 * monetisasi live (trigger: fitur payment masuk).
 */

// Kode promo statis (mode uji): TRAKINGPRO → Pro 3 hari, PROMOMERDEKA → Pro 7
// hari, case-insensitive.
// honey: hardcoded = butuh redeploy buat ganti; pindahin ke env/DB kalau promo
// mulai ganti-ganti (trigger: lebih dari 1 promo atau promo berbayar).
const PROMO_CODES: Record<string, { tier: "pro"; days: number }> = {
  trakingpro: { tier: "pro", days: 3 },
  promomerdeka: { tier: "pro", days: 7 },
};

export async function POST(req: NextRequest) {
  try {
    const { code, tier } = (await req.json()) as { code?: string; tier?: string };

    // Promo dicek duluan biar kode promo bisa override tier yang diklik user.
    const promo = PROMO_CODES[(code ?? "").trim().toLowerCase()];
    if (promo) {
      return NextResponse.json({ ok: true, tier: promo.tier, days: promo.days });
    }

    const expected = process.env.PREMIUM_ACTIVATION_CODE;
    if (!expected) {
      return NextResponse.json(
        { ok: false, error: "Pengaktifan belum diatur (PREMIUM_ACTIVATION_CODE kosong)" },
        { status: 503 },
      );
    }
    if (!code || code.trim() !== expected) {
      return NextResponse.json({ ok: false, error: "Kode pengaktifan salah" }, { status: 401 });
    }
    if (tier !== "plus" && tier !== "pro") {
      return NextResponse.json({ ok: false, error: "Tier tidak valid" }, { status: 400 });
    }
    // Durasi default 30 hari; bisa di-override env untuk masa uji.
    const days = Number(process.env.PREMIUM_TRIAL_DAYS || 30);
    return NextResponse.json({ ok: true, tier, days });
  } catch {
    return NextResponse.json({ ok: false, error: "Request tidak valid" }, { status: 400 });
  }
}
