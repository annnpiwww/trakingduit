"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Cpu,
  HardDrive,
  Database,
  Mail,
  UserCheck,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

export default function PrivacyPolicyPage() {
  return (
    <div className="relative min-h-screen bg-bg text-fg selection:bg-brand selection:text-brand-fg overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[520px] rounded-full bg-gradient-to-b from-brand/15 to-transparent blur-[120px] dark:from-brand/25" />
        <div className="absolute top-[35%] -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-accent/10 to-transparent blur-[140px] dark:from-accent/20" />
        <div className="absolute inset-0 bg-grid-pattern opacity-60 dark:opacity-40" />
      </div>

      <PublicHeader currentPath="/privacy" />

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {/* Header Section */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3.5 py-1 text-xs font-semibold text-brand">
            <ShieldCheck className="size-4" />
            <span>Compliance & Legal Standards • UU PDP & Global Guidelines</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Kebijakan Privasi <span className="text-brand">& Data Governance</span>
          </h1>
          <p className="text-base text-muted sm:text-lg">
            Privacy Policy & AI Data Protection Commitment for TrakingDuit
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-muted">
            <span className="rounded-md bg-surface px-2.5 py-1 border border-border/80">
              Versi: 2.1 (Terakhir Diperbarui: Maret 2026)
            </span>
            <span className="rounded-md bg-surface px-2.5 py-1 border border-border/80">
              Yurisdiksi: Republik Indonesia & Internasional
            </span>
          </div>
        </div>

        {/* Executive Summary Card / Bilingual Highlights */}
        <div className="mt-10 rounded-2xl border border-brand/30 bg-surface/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand text-brand-fg">
              <Lock className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold sm:text-xl">Ringkasan Eksekutif (Executive Summary)</h2>
              <p className="text-xs text-muted">Prinsip dasar perlindungan data di TrakingDuit</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs sm:text-sm">
            <div className="rounded-xl border border-border/70 bg-surface-2/60 p-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-fg">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>100% Local-First Vault</span>
              </div>
              <p className="text-muted leading-relaxed">
                Data keuangan dan riwayat transaksi disimpan di perangkat Anda secara lokal (IndexedDB). Tidak ada data transaksi yang diunggah ke server pihak ketiga secara otomatis tanpa persetujuan Anda.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-surface-2/60 p-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-fg">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Zero AI Model Training</span>
              </div>
              <p className="text-muted leading-relaxed">
                Pemrosesan AI via Anthropic Claude 3.5 Sonnet dilakukan secara stateless dan privat. <strong>Data Anda TIDAK PERNAH digunakan untuk melatih model AI publik</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-surface-2/60 p-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-fg">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Enkripsi & Kendali Penuh</span>
              </div>
              <p className="text-muted leading-relaxed">
                Akses aplikasi dilindungi PIN 6-digit dengan enkripsi sisi klien. Anda bebas mengekspor (CSV/JSON) atau menghapus seluruh basis data lokal kapan saja dalam satu klik.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-surface-2/60 p-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-fg">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Data Controller Resmi</span>
              </div>
              <p className="text-muted leading-relaxed">
                Pengawasan privasi dikelola langsung oleh tim pendiri TrakingDuit. Dukungan kepatuhan dan hak privasi dapat dihubungi melalui email resmi <span className="text-brand font-medium">founder@trakingduit.my.id</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="mt-12 space-y-10 text-sm leading-relaxed sm:text-base">
          {/* Section 1 */}
          <section id="local-first" className="space-y-4 rounded-2xl border border-border/80 bg-surface/70 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand font-bold">
                1
              </span>
              <h2 className="text-xl font-bold tracking-tight text-fg">
                Arsitektur Local-First Vault & Penyimpanan di Perangkat
              </h2>
            </div>
            <p className="text-muted">
              TrakingDuit dibangun dengan filosofi <strong>Privacy-by-Design</strong>. Berbeda dari aplikasi finansial konvensional yang menyimpan seluruh mutasi perbankan di basis data cloud terpusat, TrakingDuit beroperasi dengan prinsip <em>Local-First</em>:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-muted">
              <li>
                <strong className="text-fg">Penyimpanan Klien (Client-Side Storage):</strong> Semua data dompet, rekening, transaksi harian, kategori, hutang-piutang, dan ringkasan tagihan disimpan secara lokal di peramban atau perangkat Anda melalui teknologi IndexedDB (didukung Dexie.js).
              </li>
              <li>
                <strong className="text-fg">Enkripsi Akses Lokal:</strong> Akses ke database lokal dilindungi dengan mekanisme penguncian PIN 6-digit (client-side PIN vault) untuk mencegah akses fisik yang tidak berwenang pada perangkat Anda.
              </li>
              <li>
                <strong className="text-fg">Tanpa Server Sentral untuk Data Ledger:</strong> Secara default, TrakingDuit tidak melakukan transmisi otomatis data buku kas Anda ke server backend kami. Semua kalkulasi anggaran dan metrik Safe-to-Spend dikomputasi langsung pada CPU perangkat Anda.
              </li>
              <li>
                <strong className="text-fg">Sinkronisasi Pilihan Pengguna (User-Controlled Sync):</strong> Fitur sinkronisasi eksternal (seperti ekspor Google Sheets atau integrasi Supabase) sepenuhnya bersifat opsional (opt-in) dan memerlukan otorisasi eksplisit dari pengguna.
              </li>
            </ul>
          </section>

          {/* Section 2 - AI and Anthropic Integration */}
          <section id="ai-governance" className="space-y-4 rounded-2xl border border-brand/40 bg-surface/80 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-fg font-bold">
                2
              </span>
              <h2 className="text-xl font-bold tracking-tight text-fg">
                Penggunaan Kecerdasan Buatan (AI) & Tata Kelola Model LLM
              </h2>
            </div>

            <p className="text-muted">
              TrakingDuit memanfaatkan model kecerdasan buatan terdepan, <strong>Anthropic Claude 3.5 Sonnet</strong>, untuk menyediakan dua fungsionalitas cerdas:
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
              <div className="rounded-xl border border-border/80 bg-surface-2/70 p-4">
                <div className="flex items-center gap-2 font-semibold text-fg">
                  <Sparkles className="size-4 text-brand" />
                  <span>Multimodal Receipt OCR</span>
                </div>
                <p className="mt-2 text-xs text-muted leading-relaxed">
                  Ekstraksi otomatis foto nota fisik dan struk digital untuk mengenali nama toko/merchant, rincian item barang, nilai pajak/diskon, dan total pembayaran secara zero-shot dalam hitungan detik.
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-surface-2/70 p-4">
                <div className="flex items-center gap-2 font-semibold text-fg">
                  <Cpu className="size-4 text-accent" />
                  <span>Financial Reasoning Copilot</span>
                </div>
                <p className="mt-2 text-xs text-muted leading-relaxed">
                  Analisis tren arus kas, perhitungan runway cadangan dana darurat, dan simulasi alokasi Safe-to-Spend berbasis penalaran matematis tingkat tinggi.
                </p>
              </div>
            </div>

            {/* Crucial Anthropic Startup Program / Enterprise Compliance Callout */}
            <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 dark:bg-emerald-950/20">
              <div className="flex items-start gap-3">
                <ShieldCheck className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-fg">
                    Jaminan Nol Pelatihan Publik (Strict Zero-Training Guarantee)
                  </h4>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    Sesuai dengan ketentuan komersial API Anthropic dan standar etika kecerdasan buatan:
                  </p>
                  <ul className="list-disc pl-4 pt-1 text-xs text-muted space-y-1">
                    <li>
                      <strong>TIDAK ADA DATA PENGGUNA UNTUK TRAINING:</strong> Data transaksi, gambar nota, prompt finansial, maupun output analisis dari pengguna <strong>TIDAK PERNAH digunakan</strong> untuk melatih (train), melatih ulang (retrain), atau menyempurnakan (fine-tune) model fondasi publik Anthropic maupun pihak ketiga mana pun.
                    </li>
                    <li>
                      <strong>Pemrosesan Stateless & Zero-Retention:</strong> Setiap payload inferensi dikirimkan melalui saluran terenkripsi TLS 1.3, diproses secara in-memory untuk ekstraksi struktur data JSON, dan tidak disimpan secara permanen pada log publik AI.
                    </li>
                    <li>
                      <strong>Minimisasi & Sanitasi Data (Data Minimization):</strong> Sebelum gambar atau teks dikirimkan ke endpoint AI, sistem hanya meneruskan konteks relevan transaksi. Pengguna dilarang memasukkan dan sistem tidak meminta kredensial perbankan rahasia seperti CVV/CVC, kata sandi internet banking, atau token OTP.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 - What Data We Collect */}
          <section id="data-collection" className="space-y-4 rounded-2xl border border-border/80 bg-surface/70 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand font-bold">
                3
              </span>
              <h2 className="text-xl font-bold tracking-tight text-fg">
                Data yang Dikumpulkan dan Dasar Pemrosesan
              </h2>
            </div>
            <p className="text-muted">
              Kami memegang prinsip minimisasi pengumpulan data:
            </p>
            <div className="space-y-3 text-muted">
              <div className="border-l-2 border-brand pl-4">
                <h4 className="font-semibold text-fg">Data Akun & Autentikasi</h4>
                <p className="text-xs sm:text-sm">
                  Jika Anda memilih mode Cloud/Supabase, kami menyimpan alamat email dan hash kata sandi terenkripsi untuk kebutuhan otentikasi sesi. Pada mode Local-Only, tidak ada email yang diwajibkan.
                </p>
              </div>
              <div className="border-l-2 border-brand pl-4">
                <h4 className="font-semibold text-fg">Data Transaksi & Finansial</h4>
                <p className="text-xs sm:text-sm">
                  Nominal angka, nama dompet (misal: "BCA", "Tunai", "GoPay"), kategori pengeluaran, tanggal, serta catatan yang Anda input. Semua disimpan di IndexedDB lokal perangkat Anda.
                </p>
              </div>
              <div className="border-l-2 border-brand pl-4">
                <h4 className="font-semibold text-fg">Data Telemetri Teknis Anonim</h4>
                <p className="text-xs sm:text-sm">
                  Informasi teknis dasar peramban (user-agent, versi sistem operasi, error log klien) yang digunakan semata-mata untuk diagnosis kestabilan aplikasi, perbaikan crash, dan kompatibilitas PWA. Kami tidak menggunakan pelacak iklan pihak ketiga (seperti Facebook Pixel atau Google Ads Tracker).
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 - User Rights under UU PDP & GDPR */}
          <section id="data-rights" className="space-y-4 rounded-2xl border border-border/80 bg-surface/70 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand font-bold">
                4
              </span>
              <h2 className="text-xl font-bold tracking-tight text-fg">
                Hak Pengguna & Kedaulatan Data (User Rights & Sovereignty)
              </h2>
            </div>
            <p className="text-muted">
              Berdasarkan Undang-Undang No. 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP) serta prinsip regulasi global seperti GDPR:
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2 text-xs sm:text-sm">
              <div className="rounded-xl border border-border/80 bg-surface-2/60 p-4">
                <h5 className="font-semibold text-fg">Hak Akses & Portabilitas</h5>
                <p className="mt-1 text-muted text-xs">
                  Anda berhak mengunduh seluruh salinan data buku kas Anda kapan saja dalam format standar CSV atau JSON melalui menu Pengaturan.
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-surface-2/60 p-4">
                <h5 className="font-semibold text-fg">Hak Koreksi & Pembaruan</h5>
                <p className="mt-1 text-muted text-xs">
                  Anda memiliki kendali penuh untuk mengedit, memodifikasi, atau merevisi transaksi maupun riwayat dompet secara langsung dan instan.
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-surface-2/60 p-4">
                <h5 className="font-semibold text-fg">Hak Penghapusan (Right to be Forgotten)</h5>
                <p className="mt-1 text-muted text-xs">
                  Dengan menggunakan tombol "Hapus Seluruh Data" di pengaturan, seluruh database lokal akan di-wipe secara permanen dari perangkat Anda.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5 - Data Controller & Contact */}
          <section id="controller-contact" className="space-y-4 rounded-2xl border border-border/80 bg-surface/70 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand font-bold">
                5
              </span>
              <h2 className="text-xl font-bold tracking-tight text-fg">
                Pengendali Data Resmi & Saluran Kontak (Data Controller)
              </h2>
            </div>
            <p className="text-muted">
              Pihak yang bertanggung jawab sebagai Pengendali Data (Data Controller) untuk platform TrakingDuit adalah:
            </p>
            <div className="rounded-xl border border-border/80 bg-surface p-5 space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs sm:text-sm">
                <div>
                  <span className="text-muted">Nama Pengendali Data / Entitas:</span>
                  <p className="font-semibold text-fg">Farhan Lakoro (Founder & Lead Developer)</p>
                </div>
                <div>
                  <span className="text-muted">Platform:</span>
                  <p className="font-semibold text-fg">TrakingDuit (https://trakingduit.my.id)</p>
                </div>
                <div>
                  <span className="text-muted">Alamat Email Resmi:</span>
                  <p>
                    <a
                      href="mailto:founder@trakingduit.my.id"
                      className="font-semibold text-brand hover:underline"
                    >
                      founder@trakingduit.my.id
                    </a>
                  </p>
                </div>
                <div>
                  <span className="text-muted">Domisili Hukum:</span>
                  <p className="font-semibold text-fg">Indonesia</p>
                </div>
              </div>
              <div className="border-t border-border/60 pt-3 text-xs text-muted">
                Untuk pertanyaan kepatuhan, permohonan audit data, pertanyaan review program akselerator/startup, atau pelaporan kerentanan keamanan, silakan hubungi saluran email di atas. Kami berkomitmen menanggapi setiap permintaan dalam waktu 1-3 hari kerja.
              </div>
            </div>
          </section>
        </div>

        {/* Bottom CTA / Return to home */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border/80 bg-surface/80 p-6 sm:flex-row">
          <div>
            <h3 className="font-bold text-fg">Siap Mengelola Finansial dengan Privasi Aman?</h3>
            <p className="text-xs text-muted">Mulai catat transaksi secara lokal tanpa rasa khawatir.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-border/80 bg-surface-2 px-4 py-2 text-xs font-semibold text-fg transition hover:bg-surface"
            >
              Kembali ke Beranda
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-brand-fg shadow-sm transition hover:brightness-110"
            >
              Buka Aplikasi
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
