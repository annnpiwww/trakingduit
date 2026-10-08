"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  ScanText,
  Receipt,
  Wallet,
  Bot,
  ArrowRight,
  CheckCircle2,
  Lock,
  Coins,
  Sun,
  Moon,
  Menu,
  X,
  CreditCard,
  Cpu,
  TrendingUp,
  ArrowUpRight,
  EyeOff,
  Building,
  Zap,
  ChevronDown,
  Mail,
  HardDrive,
  FileSpreadsheet,
  Check,
  Layers,
} from "lucide-react";
import { useTheme } from "@/lib/theme";

/* -------------------------------------------------------------------------- */
/*                               MOCK AI DATA                                 */
/* -------------------------------------------------------------------------- */

interface DemoScenario {
  id: string;
  tabTitle: string;
  userPrompt: string;
  aiResponse: {
    badge: string;
    headline: string;
    content: string;
    metrics?: { label: string; value: string; tone: "positive" | "warning" | "neutral" }[];
    actionTip?: string;
  };
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "cashflow",
    tabTitle: "Safe-to-Spend Reasoning",
    userPrompt: "Duitku aman gak sampai akhir bulan?",
    aiResponse: {
      badge: "Claude 3.5 Sonnet Financial Reasoning",
      headline: "Arus kas sehat, aman terkendali dengan sisa runway 21 hari.",
      content:
        "Berdasarkan analisis real-time dari seluruh dompet dan tagihan mendatang, sisa safe-to-spend kamu berada di level optimal. Namun perhatikan pos Food & Dining yang sudah memakai 78% batas budget bulanan.",
      metrics: [
        { label: "Safe to Spend", value: "Rp 3.450.000", tone: "positive" },
        { label: "Komitmen Tagihan", value: "Rp 1.150.000", tone: "neutral" },
        { label: "Budget Makan", value: "Sisa 22%", tone: "warning" },
      ],
      actionTip: "Rekomendasi: Tahan belanja non-esensial akhir pekan ini untuk mengamankan sisa dana tabungan.",
    },
  },
  {
    id: "ocr-audit",
    tabTitle: "Receipt Vision Scanner",
    userPrompt: "Barusan scan nota belanja Supermarket Rp 248.500, tolong catat.",
    aiResponse: {
      badge: "Multimodal Vision OCR Engine",
      headline: "Nota berhasil diverifikasi dan diekstrak ke 3 pos kategori.",
      content:
        "Vision scanner mendeteksi 5 item belanja: Minyak Goreng 2L, Telur Ayam 1kg, Sayur Segar, dan Sabun Cuci. Otomatis dialokasikan ke Kebutuhan Pokok (Rp 195.000) dan Perlengkapan Rumah (Rp 53.500).",
      metrics: [
        { label: "Merchant", value: "Super Indo", tone: "neutral" },
        { label: "Total Terdeteksi", value: "Rp 248.500", tone: "positive" },
        { label: "Akurasi OCR", value: "99.8%", tone: "positive" },
      ],
      actionTip: "Saldo Dompet BCA otomatis diperbarui secara lokal tanpa data dikirim ke cloud pihak ketiga.",
    },
  },
  {
    id: "goals",
    tabTitle: "Target Nabung & Debt Freedom",
    userPrompt: "Gimana caranya kumpul 15 juta buat dana darurat dalam 6 bulan?",
    aiResponse: {
      badge: "Financial Strategy Copilot",
      headline: "Target sangat realistis dengan alokasi Rp 2.500.000/bulan.",
      content:
        "Dari tren cashflow 3 bulan terakhir, kamu memiliki surplus bersih rata-rata Rp 2.800.000 per bulan. Aku sarankan setup auto-save setiap tanggal gajian sebelum dialokasikan ke pengeluaran fleksibel.",
      metrics: [
        { label: "Target Bulanan", value: "Rp 2.500.000", tone: "neutral" },
        { label: "Estimasi Tercapai", value: "5,8 Bulan", tone: "positive" },
        { label: "Potensi Efisiensi", value: "+Rp 420.000", tone: "warning" },
      ],
      actionTip: "Ditemukan 2 langganan streaming dobel yang jarang dipakai. Batalkan untuk hemat Rp 218.000/bln.",
    },
  },
];

const FAQS = [
  {
    q: "Apakah data keuangan saya aman dan tidak bisa diintip siapa pun?",
    a: "Sangat aman. TrakingDuit dibangun dengan arsitektur Local-First. Semua riwayat transaksi, mutasi, dan nota disimpan di database lokal perangkat Anda (IndexedDB via Dexie). Tidak ada pelacak pihak ketiga, tidak ada penjualan data ke pihak periklanan.",
  },
  {
    q: "Mengapa TrakingDuit ditenagai Anthropic Claude 3.5 Sonnet?",
    a: "Claude 3.5 Sonnet memiliki kemampuan mathematical & financial reasoning terbaik di kelasnya. Bukan sekadar chatbot generik, asisten Tradu AI mampu menganalisis pola arus kas, mengidentifikasi anomali pengeluaran mikro, serta memberikan saran finansial yang berakar pada data riil Anda.",
  },
  {
    q: "Bagaimana cara kerja Smart Receipt Vision Scanner?",
    a: "Anda cukup mengambil foto nota fisik atau struk belanja digital. Model Computer Vision kami memindai struktur nota, membaca nama merchant, rincian per baris item belanja, potongan diskon, pajak, dan mencocokkannya ke kategori dompet dalam 2 detik.",
  },
  {
    q: "Apakah TrakingDuit mendukung mutasi bank dan e-wallet di Indonesia?",
    a: "Ya! TrakingDuit dilengkapi parser mutasi cerdas untuk format notifikasi bank lokal seperti BCA, Bank Mandiri, BNI, BRI, serta e-wallet seperti GoPay, OVO, Dana, dan transaksi QRIS.",
  },
  {
    q: "Bisa digunakan secara offline tanpa koneksi internet?",
    a: "Tentu saja. TrakingDuit berfungsi penuh secara offline sebagai Progressive Web App (PWA). Anda tetap bisa mencatat transaksi, cek saldo dompet, dan mengelola tagihan kapan pun di mana pun.",
  },
];

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

export default function LandingPage() {
  const { theme, toggle } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [activeScenario, setActiveScenario] = React.useState(0);
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [receiptView, setReceiptView] = React.useState<"extracted" | "raw">("extracted");

  const currentScenario = DEMO_SCENARIOS[activeScenario];

  return (
    <div className="relative min-h-screen bg-bg text-fg selection:bg-brand selection:text-brand-fg overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[520px] rounded-full bg-gradient-to-b from-brand/15 to-transparent blur-[120px] dark:from-brand/25" />
        <div className="absolute top-[45%] -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-accent/10 to-transparent blur-[140px] dark:from-accent/20" />
        <div className="absolute top-[75%] -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-brand/10 to-transparent blur-[140px] dark:from-brand/20" />
        <div className="absolute inset-0 bg-grid-pattern opacity-60 dark:opacity-40" />
      </div>

      {/* -------------------------------------------------------------------- */}
      {/*                                NAVBAR                                */}
      {/* -------------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-bg/75 backdrop-blur-xl transition-colors">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <Link href="/" className="group flex items-center gap-3 transition-opacity hover:opacity-90">
            <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-xl bg-brand text-brand-fg shadow-sm ring-1 ring-border/20">
              <Image
                src="/icons/logo.png"
                alt="Logo TrakingDuit"
                width={40}
                height={40}
                className="size-full object-cover transition-transform group-hover:scale-105"
                priority
              />
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-fg">TrakingDuit</span>
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand ring-1 ring-brand/25 dark:bg-brand/20">
                  AI v1.3
                </span>
              </div>
              <span className="text-[11px] font-medium text-muted">Smart Financial Copilot</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#fitur" className="text-sm font-medium text-muted transition hover:text-fg">
              Fitur Unggulan
            </a>
            <a href="#tradu-ai" className="text-sm font-medium text-muted transition hover:text-fg">
              Tradu AI
            </a>
            <a href="#cara-kerja" className="text-sm font-medium text-muted transition hover:text-fg">
              Cara Kerja
            </a>
            <a href="#keamanan" className="text-sm font-medium text-muted transition hover:text-fg">
              Privasi Lokal
            </a>
            <a href="#faq" className="text-sm font-medium text-muted transition hover:text-fg">
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden items-center gap-3 md:flex">
            {/* Theme Toggle Button */}
            <button
              onClick={toggle}
              aria-label="Ubah Tema"
              className="flex size-9 items-center justify-center rounded-xl border border-border/80 bg-surface text-muted transition hover:border-border hover:bg-surface-2 hover:text-fg"
            >
              {theme === "dark" ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-700" />}
            </button>

            <Link
              href="/login"
              className="rounded-xl border border-border/80 bg-surface px-4 py-2 text-sm font-medium text-fg transition hover:bg-surface-2 hover:border-border"
            >
              Masuk
            </Link>
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-fg shadow-sm shadow-brand/20 transition hover:brightness-110 active:scale-[0.98]"
            >
              <span>Buka Dashboard</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggle}
              aria-label="Ubah Tema"
              className="flex size-9 items-center justify-center rounded-xl border border-border/80 bg-surface text-muted"
            >
              {theme === "dark" ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-700" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex size-9 items-center justify-center rounded-xl border border-border/80 bg-surface text-fg"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-border/80 bg-surface px-4 py-5 shadow-lg md:hidden"
            >
              <div className="flex flex-col gap-3">
                <a
                  href="#fitur"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-fg hover:bg-surface-2"
                >
                  Fitur Unggulan
                </a>
                <a
                  href="#tradu-ai"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-fg hover:bg-surface-2"
                >
                  Tradu AI Financial Copilot
                </a>
                <a
                  href="#cara-kerja"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-fg hover:bg-surface-2"
                >
                  Cara Kerja
                </a>
                <a
                  href="#keamanan"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-fg hover:bg-surface-2"
                >
                  Keamanan & Privasi
                </a>
                <a
                  href="#faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-fg hover:bg-surface-2"
                >
                  FAQ
                </a>
                <div className="mt-3 flex flex-col gap-2 border-t border-border/80 pt-3">
                  <Link
                    href="/login"
                    className="flex h-10 items-center justify-center rounded-xl border border-border bg-surface-2 text-sm font-medium text-fg"
                  >
                    Masuk Akun
                  </Link>
                  <Link
                    href="/dashboard"
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-brand-fg"
                  >
                    Buka Dashboard <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/*                            HERO SECTION                              */}
      {/* -------------------------------------------------------------------- */}
      <section className="relative z-10 pt-12 pb-20 md:pt-20 md:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Hero Headings */}
          <div className="mx-auto max-w-3xl text-center">
            {/* Engine Pill */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-surface px-4 py-1.5 shadow-xs"
            >
              <span className="flex size-2 rounded-full bg-income animate-pulse" />
              <span className="text-xs font-semibold text-fg">Powered by Anthropic Claude 3.5 Sonnet</span>
              <span className="text-muted">•</span>
              <span className="text-xs font-medium text-brand">Local-First Vault</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-6 text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-fg leading-[1.12]"
            >
              Kelola Keuangan Lebih Pintar dengan{" "}
              <span className="bg-gradient-to-r from-brand via-sky-500 to-accent bg-clip-text text-transparent">
                Asisten AI Generasi Baru
              </span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-base sm:text-lg text-muted leading-relaxed"
            >
              Bukan sekadar pencatat uang biasa. TrakingDuit menggabungkan penalaran finansial mendalam{" "}
              <strong className="text-fg font-semibold">Claude 3.5 Sonnet</strong>, OCR vision scanner nota instan, parser
              mutasi bank lokal, dan enkripsi data 100% di perangkat Anda.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
            >
              <Link
                href="/dashboard"
                className="group flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-brand px-6 text-base font-semibold text-brand-fg shadow-lg shadow-brand/25 transition hover:brightness-110 active:scale-[0.98] sm:w-auto"
              >
                <span>Buka Dashboard Sekarang</span>
                <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#tradu-ai"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border/90 bg-surface px-6 text-base font-medium text-fg shadow-xs transition hover:bg-surface-2 hover:border-border sm:w-auto"
              >
                <Bot className="size-4.5 text-brand" />
                <span>Coba Interaktif Tradu AI</span>
              </a>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs font-medium text-muted"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-income" /> 100% Data di Perangkat Kamu
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-income" /> Enkripsi Lokal Berstandar Tinggi
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-income" /> Tanpa Iklan & Pelacak
              </span>
            </motion.div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/*              HERO VISUAL MOCK: INTERACTIVE TRADU AI                */}
          {/* ------------------------------------------------------------------ */}
          <motion.div
            id="tradu-ai"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-14 mx-auto max-w-5xl"
          >
            <div className="relative rounded-2xl border border-border/80 bg-surface shadow-2xl overflow-hidden ring-1 ring-border/50">
              {/* Window Title Bar */}
              <div className="flex items-center justify-between border-b border-border/60 bg-surface-2/70 px-4 py-3 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-rose-500/80" />
                  <div className="size-3 rounded-full bg-amber-500/80" />
                  <div className="size-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 hidden font-mono text-xs text-muted sm:inline-block">
                    trakingduit-app // tradu-copilot.terminal
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-1 text-xs font-medium text-fg shadow-2xs border border-border/50">
                  <Sparkles className="size-3.5 text-brand" />
                  <span>Tradu AI Financial Copilot</span>
                  <span className="rounded-md bg-income/10 px-1.5 py-0.2 text-[10px] font-semibold text-income">
                    Online
                  </span>
                </div>
              </div>

              {/* Terminal Workspace */}
              <div className="p-4 sm:p-6 lg:p-8">
                {/* Scenario Switcher Tabs */}
                <div className="flex flex-wrap items-center gap-2 pb-6 border-b border-border/60">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider mr-1">
                    Simulasi Kasus:
                  </span>
                  {DEMO_SCENARIOS.map((scenario, index) => (
                    <button
                      key={scenario.id}
                      onClick={() => setActiveScenario(index)}
                      className={`cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
                        activeScenario === index
                          ? "bg-brand text-brand-fg shadow-xs shadow-brand/25"
                          : "bg-surface-2 text-muted hover:text-fg hover:bg-border/60"
                      }`}
                    >
                      {scenario.tabTitle}
                    </button>
                  ))}
                </div>

                {/* Conversation Flow */}
                <div className="mt-6 space-y-5">
                  {/* User Bubble */}
                  <div className="flex items-start justify-end gap-3">
                    <div className="max-w-xl rounded-2xl rounded-tr-sm bg-brand px-4 py-3 text-sm text-brand-fg shadow-xs">
                      <p className="font-medium">{currentScenario.userPrompt}</p>
                      <span className="mt-1 block text-right text-[10px] text-brand-fg/70">Kamu • Baru saja</span>
                    </div>
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 border border-border text-fg font-bold text-xs">
                      YOU
                    </div>
                  </div>

                  {/* Tradu AI Assistant Bubble */}
                  <div className="flex items-start gap-3">
                    <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-fg shadow-xs">
                      <Bot className="size-5" />
                      <span className="absolute -top-1 -right-1 flex size-2.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-75" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-sky-500" />
                      </span>
                    </div>

                    <div className="flex-1 max-w-2xl rounded-2xl rounded-tl-sm border border-border/80 bg-surface-2/60 p-4 sm:p-5 shadow-xs">
                      {/* Engine Tag */}
                      <div className="flex items-center gap-2 pb-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand dark:bg-brand/20">
                          <Cpu className="size-3" />
                          {currentScenario.aiResponse.badge}
                        </span>
                      </div>

                      {/* Main Insight */}
                      <h4 className="text-sm font-bold text-fg sm:text-base">
                        {currentScenario.aiResponse.headline}
                      </h4>
                      <p className="mt-1.5 text-xs sm:text-sm text-muted leading-relaxed">
                        {currentScenario.aiResponse.content}
                      </p>

                      {/* Metrics Card Grid */}
                      {currentScenario.aiResponse.metrics && (
                        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                          {currentScenario.aiResponse.metrics.map((m, i) => (
                            <div
                              key={i}
                              className="rounded-xl border border-border/80 bg-surface p-3 shadow-2xs"
                            >
                              <span className="block text-[11px] font-medium text-muted">{m.label}</span>
                              <span
                                className={`mt-0.5 block text-sm font-bold sm:text-base num ${
                                  m.tone === "positive"
                                    ? "text-income"
                                    : m.tone === "warning"
                                    ? "text-accent"
                                    : "text-fg"
                                }`}
                              >
                                {m.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actionable Tip Box */}
                      {currentScenario.aiResponse.actionTip && (
                        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-brand/20 bg-brand/5 p-3 text-xs text-fg dark:bg-brand/10">
                          <Sparkles className="size-4 shrink-0 text-brand mt-0.5" />
                          <span className="font-medium">{currentScenario.aiResponse.actionTip}</span>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between text-[11px] text-muted pt-1">
                        <span>Tradu AI Copilot • Waktu inferensi 0.4s</span>
                        <span className="text-income font-medium flex items-center gap-1">
                          <ShieldCheck className="size-3.5" /> Data aman terenkripsi lokal
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Input Bar */}
                <div className="mt-6 flex items-center gap-2 rounded-xl border border-border/80 bg-surface p-2 shadow-inner">
                  <div className="flex size-7 items-center justify-center text-muted">
                    <Sparkles className="size-4 text-brand" />
                  </div>
                  <input
                    type="text"
                    disabled
                    value="Tanya apa saja tentang keuanganmu, anggaran, atau nota..."
                    className="flex-1 bg-transparent text-xs text-muted focus:outline-none"
                    readOnly
                  />
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg transition hover:brightness-110"
                  >
                    <span>Coba Sekarang</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/*                       BENTO GRID FITUR UNGGULAN                      */}
      {/* -------------------------------------------------------------------- */}
      <section id="fitur" className="relative z-10 py-16 sm:py-24 border-t border-border/60 bg-surface/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand ring-1 ring-brand/25 dark:bg-brand/20">
              Arsitektur Berkelanjutan
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-fg sm:text-4xl">
              Semua yang Anda Butuhkan untuk Bebas Finansial
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted">
              Dirancang dengan presisi teknik tinggi tanpa kompromi antara kenyamanan AI dan privasi data mutlak.
            </p>
          </div>

          {/* Bento Grid Container */}
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Bento Card 1: Tradu AI Financial Copilot (Large Col Span 2) */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 shadow-sm transition hover:shadow-md md:col-span-2 lg:col-span-2">
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-brand/10 text-brand dark:bg-brand/20">
                    <Bot className="size-6" />
                  </div>
                  <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand border border-brand/20">
                    Claude 3.5 Sonnet
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-bold text-fg sm:text-2xl">
                  Tradu AI: Asisten Finansial dengan Deep Reasoning
                </h3>
                <p className="mt-2 text-sm text-muted leading-relaxed max-w-xl">
                  Bukan sekadar kalkulator statis. Tradu AI memahami konteks lengkap riwayat keuangan Anda,
                  menemukan pola kebocoran halus (lifestyle creep), menghitung runway safe-to-spend, dan memberi
                  saran taktis yang bisa langsung dieksekusi.
                </p>

                {/* Feature checklist */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium text-fg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-income shrink-0" />
                    <span>Analisis Safe-to-Spend harian & mingguan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-income shrink-0" />
                    <span>Deteksi tagihan berulang & langganan tidur</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-income shrink-0" />
                    <span>Simulasi target tabungan & pelunasan utang</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-income shrink-0" />
                    <span>Konsultasi gaya bahasa santai khas Indonesia</span>
                  </div>
                </div>
              </div>

              {/* Bottom Visual Widget */}
              <div className="mt-6 rounded-xl border border-border/80 bg-surface-2 p-4">
                <div className="flex items-center justify-between text-xs text-muted mb-2">
                  <span className="font-semibold text-fg">Ringkasan Analitik Bulan Ini</span>
                  <span className="text-income font-medium">Kondisi Prima (Score: 92/100)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full bg-gradient-to-r from-brand via-sky-400 to-income w-[76%]" />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-muted">
                  <span>Realisasi Pengeluaran: Rp 5.230.000</span>
                  <span>Batas Anggaran: Rp 7.500.000</span>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Smart Receipt Vision Scanner */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 shadow-sm transition hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-accent/10 text-accent dark:bg-accent/20">
                    <ScanText className="size-6" />
                  </div>
                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                    OCR Vision
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-bold text-fg sm:text-xl">Smart Receipt Vision Scanner</h3>
                <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
                  Foto struk belanja restoran, supermarket, atau apotek. AI mengekstrak merchant, baris per item,
                  pajak, dan mengkategorikannya otomatis.
                </p>

                {/* Mini Toggle View */}
                <div className="mt-5 flex rounded-lg border border-border bg-surface-2 p-1 text-[11px]">
                  <button
                    onClick={() => setReceiptView("extracted")}
                    className={`flex-1 rounded-md py-1 font-medium transition ${
                      receiptView === "extracted" ? "bg-surface text-fg shadow-2xs" : "text-muted"
                    }`}
                  >
                    Hasil Ekstraksi
                  </button>
                  <button
                    onClick={() => setReceiptView("raw")}
                    className={`flex-1 rounded-md py-1 font-medium transition ${
                      receiptView === "raw" ? "bg-surface text-fg shadow-2xs" : "text-muted"
                    }`}
                  >
                    Deteksi Nota
                  </button>
                </div>

                {/* Interactive Receipt Card Preview */}
                <div className="mt-4 rounded-xl border border-border bg-surface-2/60 p-3.5 text-xs">
                  {receiptView === "extracted" ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between font-bold text-fg">
                        <span>Kopi Kenangan Senopati</span>
                        <span className="text-expense num">Rp 48.000</span>
                      </div>
                      <div className="text-[11px] text-muted flex justify-between">
                        <span>1x Kopi Kenangan Mantan (L)</span>
                        <span className="num">Rp 26.000</span>
                      </div>
                      <div className="text-[11px] text-muted flex justify-between">
                        <span>1x Toast Cokelat Keju</span>
                        <span className="num">Rp 22.000</span>
                      </div>
                      <div className="pt-2 border-t border-border/80 flex items-center justify-between text-[11px]">
                        <span className="text-brand font-medium">Kategori: Makanan & Minuman</span>
                        <span className="text-income font-medium">✓ Selesai</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-[11px] text-muted font-mono">
                      <div className="flex items-center gap-1.5 text-accent">
                        <ScanText className="size-3.5" /> [BBOX_DETECTED: 99.4%]
                      </div>
                      <p className="bg-surface p-2 rounded border border-border/60">
                        KOPI KENANGAN #201<br />
                        TGL: 07/10/2026 14:22<br />
                        TOTAL: IDR 48.000 (PAID QRIS)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <span className="mt-4 text-[11px] text-muted block">
                Hemat waktu hingga 95% dibanding input manual satu demi satu.
              </span>
            </div>

            {/* Bento Card 3: Local-First & Absolute Privacy */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 shadow-sm transition hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-income/10 text-income dark:bg-income/20">
                    <ShieldCheck className="size-6" />
                  </div>
                  <span className="rounded-full bg-income/10 px-2.5 py-0.5 text-xs font-semibold text-income">
                    Zero Cloud Leak
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-bold text-fg sm:text-xl">Local-First & Privasi Mutlak</h3>
                <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
                  Data finansial adalah hal paling pribadi. TrakingDuit menyimpan database transaksi Anda di
                  penyimpanan lokal browser (IndexedDB Dexie) dengan enkripsi tinggi.
                </p>

                <div className="mt-5 space-y-2.5">
                  <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-2 p-2.5 text-xs">
                    <Lock className="size-4 text-income shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-fg">PIN & Enkripsi Lokal</span>
                      <p className="text-[11px] text-muted">Amankan dompet Anda dengan 6 digit PIN perangkat.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-2 p-2.5 text-xs">
                    <FileSpreadsheet className="size-4 text-brand shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-fg">Portabilitas Data Penuh</span>
                      <p className="text-[11px] text-muted">Bisa sinkron ke Google Sheet pribadi atau export CSV.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-xs text-income font-medium">
                <Check className="size-4" /> Bekerja normal tanpa internet (Offline-First)
              </div>
            </div>

            {/* Bento Card 4: Auto Bank & E-Wallet Ingest */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 shadow-sm transition hover:shadow-md md:col-span-2 lg:col-span-2">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 dark:bg-sky-500/20">
                    <CreditCard className="size-6" />
                  </div>
                  <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-500 border border-sky-500/20">
                    Auto-Parsing Mutasi
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-bold text-fg sm:text-2xl">
                  Parser Mutasi Cerdas: Bank & E-Wallet Indonesia
                </h3>
                <p className="mt-2 text-sm text-muted leading-relaxed max-w-xl">
                  Sering lupa catat saat transaksi transfer atau jajan QRIS? Copy notifikasi SMS / email mutasi, atau
                  hubungkan lewat parser cerdas. Sistem otomatis mengidentifikasi nominal, tipe transaksi (masuk / keluar),
                  dan rekening yang dituju.
                </p>

                {/* Supported Bank Pills */}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {["Bank BCA", "Bank Mandiri", "Bank BNI", "Bank BRI", "GoPay", "OVO", "ShopeePay", "DANA", "QRIS Standar"].map(
                    (inst) => (
                      <span
                        key={inst}
                        className="rounded-lg border border-border bg-surface-2 px-3 py-1 text-xs font-semibold text-fg shadow-2xs"
                      >
                        {inst}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Sample Ingest Preview */}
              <div className="mt-6 rounded-xl border border-border/80 bg-surface-2/60 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-mono text-muted">
                    <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">INGEST</span>
                    <span className="truncate">"TRSF E-BANKING DB 0710/FTS/11029239 RP 150.000 TO COFFEE SHOP"</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-income font-medium shrink-0">
                    <ArrowRight className="size-3.5" /> Terdeteksi Pengeluaran Makanan (BCA)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/*                           HOW IT WORKS                               */}
      {/* -------------------------------------------------------------------- */}
      <section id="cara-kerja" className="relative z-10 py-16 sm:py-24 border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand ring-1 ring-brand/25 dark:bg-brand/20">
              Alur Kerja Simpel
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-fg sm:text-4xl">
              Tiga Langkah Mudah Menuju Finansial Sehat
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted">
              Tidak perlu menghabiskan 30 menit setiap malam untuk mencatat tabel Excel yang rumit.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="relative rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 shadow-sm transition hover:shadow-md">
              <div className="flex size-12 items-center justify-center rounded-xl bg-brand text-brand-fg font-extrabold text-lg shadow-sm">
                01
              </div>
              <h3 className="mt-5 text-lg font-bold text-fg">Foto Nota atau Paste Mutasi</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Ambil foto struk belanjaan fisik, upload struk digital, atau tempel teks notifikasi transfer m-banking.
                Semuanya selesai dalam hitungan detik.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand">
                <ScanText className="size-4" /> Ekstraksi 100% Otomatis
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 shadow-sm transition hover:shadow-md">
              <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-fg font-extrabold text-lg shadow-sm">
                02
              </div>
              <h3 className="mt-5 text-lg font-bold text-fg">AI Mengkategorisasi & Menalar</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Claude 3.5 Sonnet membedah pos pengeluaran, menyesuaikan sisa budget, dan memvalidasi apakah pengeluaran
                tersebut masih aman terhadap rencana bulanan.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
                <Cpu className="size-4" /> Real-time Safe-to-Spend
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 shadow-sm transition hover:shadow-md">
              <div className="flex size-12 items-center justify-center rounded-xl bg-income text-income-fg font-extrabold text-lg shadow-sm">
                03
              </div>
              <h3 className="mt-5 text-lg font-bold text-fg">Keputusan Finansial Akurat</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Pantau progres dana darurat, bayar tagihan sebelum jatuh tempo, dan diskusikan rencana finansial Anda
                bersama Tradu AI kapan saja tanpa rasa takut boncos.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-income">
                <TrendingUp className="size-4" /> Zero Penyesalan di Akhir Bulan
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/*                         SECURITY DEEP DIVE                           */}
      {/* -------------------------------------------------------------------- */}
      <section id="keamanan" className="relative z-10 py-16 sm:py-24 border-t border-border/60 bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-surface to-surface-2 p-8 sm:p-12 lg:p-16 shadow-lg">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-income/10 text-income border border-income/20">
                <Lock className="size-7" />
              </div>
              <h2 className="mt-6 text-2xl font-bold tracking-tight text-fg sm:text-4xl">
                Keamanan & Privasi Tanpa Celah
              </h2>
              <p className="mt-4 text-sm sm:text-base text-muted leading-relaxed">
                Banyak aplikasi finansial menjual data belanja Anda ke agen pinjaman online atau pengiklan.
                TrakingDuit menolak praktik tersebut secara fundamental.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-border/80 bg-surface p-6">
                <HardDrive className="size-6 text-brand" />
                <h4 className="mt-4 font-bold text-fg">IndexedDB Vault</h4>
                <p className="mt-1.5 text-xs text-muted leading-relaxed">
                  Data Anda tersimpan di sandboxed database browser Anda sendiri. Akses offline cepat tanpa latensi server.
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-surface p-6">
                <EyeOff className="size-6 text-income" />
                <h4 className="mt-4 font-bold text-fg">Zero Third-Party Tracking</h4>
                <p className="mt-1.5 text-xs text-muted leading-relaxed">
                  Bebas Google Analytics agresif, bebas pixel pelacak iklan Meta, dan bebas telemetri perbankan sensitif.
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-surface p-6">
                <FileSpreadsheet className="size-6 text-accent" />
                <h4 className="mt-4 font-bold text-fg">Sovereignty & Portability</h4>
                <p className="mt-1.5 text-xs text-muted leading-relaxed">
                  Kapan pun Anda ingin berhenti, seluruh data dapat di-export ke CSV atau disinkronkan ke Google Sheet akun pribadi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/*                                 FAQ                                  */}
      {/* -------------------------------------------------------------------- */}
      <section id="faq" className="relative z-10 py-16 sm:py-24 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand ring-1 ring-brand/25 dark:bg-brand/20">
              Pertanyaan Umum
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-sm text-muted">
              Punya pertanyaan seputar cara kerja atau keamanan TrakingDuit?
            </p>
          </div>

          <div className="mt-10 space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-border/80 bg-surface overflow-hidden transition"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-fg transition hover:bg-surface-2"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`size-4 text-muted transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-brand" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-border/60 bg-surface-2/40 px-5 py-4 text-xs sm:text-sm text-muted leading-relaxed"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/*                             FINAL CTA                                */}
      {/* -------------------------------------------------------------------- */}
      <section className="relative z-10 py-16 sm:py-24 border-t border-border/60 bg-gradient-to-b from-surface/50 to-bg">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative rounded-3xl border border-brand/30 bg-gradient-to-r from-brand/10 via-surface to-accent/10 p-8 sm:p-14 shadow-xl overflow-hidden">
            <h2 className="text-2xl font-extrabold tracking-tight text-fg sm:text-4xl">
              Mulai Kendalikan Duit Anda Hari Ini
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-muted leading-relaxed">
              Langsung coba di browser tanpa proses pendaftaran berbelit. Rasakan pengalaman mengelola finansial bersama
              asisten cerdas Tradu AI.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/dashboard"
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-brand-fg shadow-lg shadow-brand/25 transition hover:brightness-110 sm:w-auto"
              >
                <span>Buka Dashboard Sekarang</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/login"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border/80 bg-surface px-6 text-sm font-medium text-fg shadow-xs transition hover:bg-surface-2 sm:w-auto"
              >
                <span>Masuk Akun Pengguna</span>
              </Link>
            </div>

            <p className="mt-5 text-xs text-muted">
              PWA Ready • Berfungsi di Android, iOS, Windows, Mac, & Linux
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/*                                FOOTER                                */}
      {/* -------------------------------------------------------------------- */}
      <footer className="relative z-10 border-t border-border/80 bg-surface py-12 text-fg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4 lg:grid-cols-5">
            {/* Col 1: Brand Info */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3">
                <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-xl bg-brand text-brand-fg shadow-xs">
                  <Image
                    src="/icons/logo.png"
                    alt="TrakingDuit"
                    width={36}
                    height={36}
                    className="size-full object-cover"
                  />
                </span>
                <span className="text-lg font-bold tracking-tight text-fg">TrakingDuit</span>
              </Link>
              <p className="mt-3 text-xs sm:text-sm text-muted leading-relaxed max-w-sm">
                Aplikasi personal finance generasi baru bertenaga AI Claude 3.5 Sonnet. Catat transaksi sekejap,
                analisis keuangan cerdas, dan jaga privasi Anda dengan arsitektur Local-First.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                <Mail className="size-4 text-brand" />
                <a
                  href="mailto:founder@trakingduit.my.id"
                  className="hover:text-fg hover:underline font-medium"
                >
                  founder@trakingduit.my.id
                </a>
              </div>
            </div>

            {/* Col 2: Produk */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Aplikasi</h4>
              <ul className="mt-3 space-y-2 text-xs text-muted">
                <li>
                  <Link href="/dashboard" className="transition hover:text-fg">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/scan" className="transition hover:text-fg">
                    Scan Nota OCR
                  </Link>
                </li>
                <li>
                  <Link href="/transactions" className="transition hover:text-fg">
                    Daftar Transaksi
                  </Link>
                </li>
                <li>
                  <Link href="/wallets" className="transition hover:text-fg">
                    Manajemen Dompet
                  </Link>
                </li>
                <li>
                  <Link href="/bills" className="transition hover:text-fg">
                    Pengingat Tagihan
                  </Link>
                </li>
                <li>
                  <Link href="/analytics" className="transition hover:text-fg">
                    Analisis Cashflow
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Keamanan & Data */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Keamanan</h4>
              <ul className="mt-3 space-y-2 text-xs text-muted">
                <li>
                  <a href="#keamanan" className="transition hover:text-fg">
                    Local-First Vault
                  </a>
                </li>
                <li>
                  <a href="#keamanan" className="transition hover:text-fg">
                    Enkripsi PIN 6 Digit
                  </a>
                </li>
                <li>
                  <a href="#keamanan" className="transition hover:text-fg">
                    Export Data (CSV/JSON)
                  </a>
                </li>
                <li>
                  <a href="#keamanan" className="transition hover:text-fg">
                    Sync Google Spreadsheet
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Legal & Kontak */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Legalitas</h4>
              <ul className="mt-3 space-y-2 text-xs text-muted">
                <li>
                  <Link href="/about" className="transition hover:text-fg">
                    Tentang Kami
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="transition hover:text-fg">
                    Kebijakan Privasi
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="transition hover:text-fg">
                    Ketentuan Layanan
                  </Link>
                </li>
                <li>
                  <a href="#faq" className="transition hover:text-fg">
                    Bantuan & FAQ
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:founder@trakingduit.my.id"
                    className="font-semibold text-brand transition hover:underline"
                  >
                    Kontak Bisnis
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted sm:flex-row">
            <p>© 2025–2026 TrakingDuit. Hak Cipta Dilindungi Undang-Undang.</p>
            <div className="flex items-center gap-4">
              <span>Dibangun dengan ❤️ untuk efisiensi finansial Indonesia</span>
              <span>•</span>
              <span className="font-mono text-[11px]">v1.33.4</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
