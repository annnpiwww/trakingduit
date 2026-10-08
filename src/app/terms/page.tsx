"use client";

import * as React from "react";
import Link from "next/link";
import {
  Scale,
  FileText,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  HardDrive,
  Cpu,
  Mail,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

export default function TermsOfServicePage() {
  return (
    <div className="relative min-h-screen bg-bg text-fg selection:bg-brand selection:text-brand-fg overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[520px] rounded-full bg-gradient-to-b from-brand/15 to-transparent blur-[120px] dark:from-brand/25" />
        <div className="absolute top-[35%] -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-accent/10 to-transparent blur-[140px] dark:from-accent/20" />
        <div className="absolute inset-0 bg-grid-pattern opacity-60 dark:opacity-40" />
      </div>

      <PublicHeader currentPath="/terms" />

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {/* Header Section */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3.5 py-1 text-xs font-semibold text-brand">
            <Scale className="size-4" />
            <span>Syarat & Ketentuan Penggunaan Layanan</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Ketentuan Layanan <span className="text-brand">(Terms of Service)</span>
          </h1>
          <p className="text-base text-muted sm:text-lg">
            User Agreement & Service Standards for TrakingDuit Platform
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-muted">
            <span className="rounded-md bg-surface px-2.5 py-1 border border-border/80">
              Versi: 2.0 (Terakhir Diperbarui: Maret 2026)
            </span>
            <span className="rounded-md bg-surface px-2.5 py-1 border border-border/80">
              Yurisdiksi: Hukum Republik Indonesia
            </span>
          </div>
        </div>

        {/* Financial Disclaimer Banner */}
        <div className="mt-10 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 shadow-sm backdrop-blur-sm sm:p-7 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="text-base font-bold text-fg sm:text-lg">
                Penting: Penafian Nasihat Keuangan (Financial Advice Disclaimer)
              </h2>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                TrakingDuit adalah platform perangkat lunak manajemen keuangan pribadi mandiri (self-management software tool). <strong>TrakingDuit, pendiri, pengembang, maupun kecerdasan buatan terintegrasi (Anthropic Claude 3.5 Sonnet) BUKANLAH lembaga penasihat keuangan berlisensi, konsultan investasi, pialang saham, perencana pajak, atau institusi perbankan resmi</strong> yang berada di bawah pengawasan Otoritas Jasa Keuangan (OJK), Bappebti, SEC, MAS, maupun otoritas moneter mana pun.
              </p>
              <p className="text-xs text-muted leading-relaxed">
                Semua proyeksi kas, saran safe-to-spend, ringkasan pengeluaran, dan analitik yang disajikan bertujuan sebagai sarana informasi, komputasi, dan edukasi mandiri. Pengguna memegang tanggung jawab mutlak atas setiap keputusan alokasi dana, pengeluaran, pembayaran utang, dan investasi pribadi mereka.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="mt-12 space-y-10 text-sm leading-relaxed sm:text-base">
          {/* Section 1: Scope of Service */}
          <section id="scope" className="space-y-4 rounded-2xl border border-border/80 bg-surface/70 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand font-bold">
                1
              </span>
              <h2 className="text-xl font-bold tracking-tight text-fg">
                Ruang Lingkup Aplikasi & Karakteristik Layanan
              </h2>
            </div>
            <p className="text-muted">
              TrakingDuit menyediakan layanan piranti lunak berbasis web dan Progressive Web App (PWA) untuk membantu individu dan pemilik usaha mikro mengelola arus kas harian mereka, meliputi:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-muted">
              <li>
                <strong className="text-fg">Pencatatan Transaksi & Multi-Wallet:</strong> Manajemen saldo dompet tunai, rekening bank, dan dompet digital (e-wallet) secara terstruktur.
              </li>
              <li>
                <strong className="text-fg">Smart Receipt OCR Scanner:</strong> Pemindaian dan ekstraksi informasi nota belanja menggunakan model Computer Vision multimodal.
              </li>
              <li>
                <strong className="text-fg">Tradu AI Financial Copilot:</strong> Rekomendasi perhitungan alokasi sisa dana (Safe-to-Spend) dan pengelompokan anggaran cerdas.
              </li>
              <li>
                <strong className="text-fg">Pengingat Tagihan & Hutang:</strong> Pelacakan komitmen cicilan berkala dan manajemen piutang dengan pelaporan status jatuh tempo.
              </li>
              <li>
                <strong className="text-fg">Local-First Vault:</strong> Pengoperasian penuh secara offline tanpa ketergantungan koneksi internet konstan.
              </li>
            </ul>
          </section>

          {/* Section 2: User Responsibility and Device Safety */}
          <section id="user-responsibilities" className="space-y-4 rounded-2xl border border-border/80 bg-surface/70 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand font-bold">
                2
              </span>
              <h2 className="text-xl font-bold tracking-tight text-fg">
                Kepemilikan Akun, Perangkat, dan Cadangan Data
              </h2>
            </div>
            <p className="text-muted">
              Karena TrakingDuit menerapkan paradigma Local-First di mana data tersimpan di media penyimpanan peramban lokal (IndexedDB):
            </p>
            <ul className="list-disc space-y-2 pl-5 text-muted">
              <li>
                <strong className="text-fg">Tanggung Jawab Cadangan (Data Backup):</strong> Pengguna bertanggung jawab penuh untuk melakukan pencadangan berkala (melalui fitur Export CSV / JSON atau Sync Google Sheets). TrakingDuit tidak bertanggung jawab atas hilangnya data lokal yang diakibatkan oleh pembersihan cache browser secara manual, penghapusan data situs peramban, kerusakan perangkat keras, atau kehilangan perangkat fisik Anda.
              </li>
              <li>
                <strong className="text-fg">Keamanan Akses PIN:</strong> Anda bertanggung jawab menjaga kerahasiaan PIN 6-digit yang disetel pada perangkat Anda.
              </li>
              <li>
                <strong className="text-fg">Keabsahan Data Input:</strong> Keakuratan laporan finansial bergantung sepenuhnya pada ketepatan data transaksi yang diinput oleh pengguna atau dikonfirmasi dari hasil pindaian nota.
              </li>
            </ul>
          </section>

          {/* Section 3: AI Service Usage & Acceptable Use */}
          <section id="acceptable-use" className="space-y-4 rounded-2xl border border-border/80 bg-surface/70 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand font-bold">
                3
              </span>
              <h2 className="text-xl font-bold tracking-tight text-fg">
                Ketentuan Penggunaan AI & Batasan yang Dilarang (Acceptable Use Policy)
              </h2>
            </div>
            <p className="text-muted">
              Saat memanfaatkan fitur berbasis AI (Tradu AI & OCR Scanner):
            </p>
            <ul className="list-disc space-y-2 pl-5 text-muted">
              <li>
                Dilarang mengunggah gambar atau dokumen yang mengandung materi ilegal, melanggar hak cipta pihak ketiga, memuat malware, atau informasi rahasia negara.
              </li>
              <li>
                Dilarang melakukan reverse engineering, dekompilasi, bypass kuota rate-limit, scraping otomatis masif, atau serangan DoS/DDoS pada API endpoint TrakingDuit.
              </li>
              <li>
                Pengguna memahami bahwa hasil ekstraksi OCR dan saran berbasis AI mungkin memiliki margin kesalahan komputasi (AI hallucination/OCR noise), dan pengguna wajib memeriksa kembali nominal sebelum menyetujui transaksi final.
              </li>
            </ul>
          </section>

          {/* Section 4: Limitation of Liability */}
          <section id="liability" className="space-y-4 rounded-2xl border border-border/80 bg-surface/70 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand font-bold">
                4
              </span>
              <h2 className="text-xl font-bold tracking-tight text-fg">
                Batasan Tanggung Jawab (Limitation of Liability)
              </h2>
            </div>
            <p className="text-muted">
              LAYANAN TRAKINGDUIT DISEDIAKAN DALAM KEADAAN &ldquo;SEBAGAIMANA ADANYA&rdquo; (AS IS) DAN &ldquo;SEBAGAIMANA TERSEDIA&rdquo; (AS AVAILABLE) TANPA JAMINAN APA PUN, BAIK TERSURAT MAUPUN TERSIRAT.
            </p>
            <p className="text-muted">
              Sepanjang diizinkan oleh hukum yang berlaku, TrakingDuit beserta pengembang dan afiliasinya tidak bertanggung jawab atas kerugian langsung, tidak langsung, insidental, khusus, atau konsekuensial, termasuk namun tidak terbatas pada:
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-muted">
              <li>Kerugian finansial akibat keputusan bisnis atau investasi yang Anda ambil.</li>
              <li>Kehilangan keuntungan, peluang pendapatan, atau data bisnis.</li>
              <li>Gangguan teknis pihak ketiga (seperti pemadaman infrastruktur cloud, gangguan ISP, atau pemeliharaan API AI pihak ketiga).</li>
            </ul>
          </section>

          {/* Section 5: Governing Law & Contact */}
          <section id="governing-law" className="space-y-4 rounded-2xl border border-border/80 bg-surface/70 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand font-bold">
                5
              </span>
              <h2 className="text-xl font-bold tracking-tight text-fg">
                Hukum yang Berlaku & Penyelesaian Sengketa
              </h2>
            </div>
            <p className="text-muted">
              Ketentuan Layanan ini diatur dan ditafsirkan sesuai dengan hukum yang berlaku di <strong>Negara Kesatuan Republik Indonesia</strong>. Segala perselisihan atau sengketa yang timbul dari atau terkait dengan penggunaan platform TrakingDuit akan diselesaikan terlebih dahulu secara musyawarah untuk mufakat.
            </p>
            <div className="rounded-xl border border-border/80 bg-surface p-5 space-y-2">
              <h4 className="font-semibold text-fg">Pertanyaan Hukum & Hak Pengguna</h4>
              <p className="text-xs sm:text-sm text-muted">
                Untuk permohonan klarifikasi ketentuan layanan, pertanyaan legalitas, atau korespondensi resmi:
              </p>
              <div className="pt-2 text-xs sm:text-sm">
                <span className="text-muted">Email Korespondensi: </span>
                <a
                  href="mailto:founder@trakingduit.my.id"
                  className="font-semibold text-brand hover:underline"
                >
                  founder@trakingduit.my.id
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom CTA / Return to home */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border/80 bg-surface/80 p-6 sm:flex-row">
          <div>
            <h3 className="font-bold text-fg">Jelajahi Fitur Unggulan TrakingDuit</h3>
            <p className="text-xs text-muted">Transparansi, kontrol penuh, dan tanpa biaya tersembunyi.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-border/80 bg-surface-2 px-4 py-2 text-xs font-semibold text-fg transition hover:bg-surface"
            >
              Kembali ke Beranda
            </Link>
            <Link
              href="/privacy"
              className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-brand-fg shadow-sm transition hover:brightness-110"
            >
              Baca Kebijakan Privasi
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
