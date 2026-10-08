"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  Sparkles,
  ShieldCheck,
  Cpu,
  Globe2,
  Rocket,
  Users,
  Code2,
  Lock,
  Mail,
  ArrowRight,
  ExternalLink,
  Target,
  Zap,
  CheckCircle2,
  Layers,
  Award,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

export default function AboutUsPage() {
  return (
    <div className="relative min-h-screen bg-bg text-fg selection:bg-brand selection:text-brand-fg overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[520px] rounded-full bg-gradient-to-b from-brand/15 to-transparent blur-[120px] dark:from-brand/25" />
        <div className="absolute top-[30%] -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-accent/10 to-transparent blur-[140px] dark:from-accent/20" />
        <div className="absolute top-[65%] -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-brand/10 to-transparent blur-[140px] dark:from-brand/20" />
        <div className="absolute inset-0 bg-grid-pattern opacity-60 dark:opacity-40" />
      </div>

      <PublicHeader currentPath="/about" />

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {/* Hero Section */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3.5 py-1 text-xs font-semibold text-brand">
            <Rocket className="size-4" />
            <span>Next-Gen Financial Intelligence • Southeast Asia</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Tentang <span className="text-brand">TrakingDuit</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base text-muted sm:text-lg">
            Membangun kedaulatan finansial berbasis kecerdasan buatan otonom dan arsitektur Local-First untuk individu serta bisnis mikro di Asia Tenggara.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-muted">
            <span className="rounded-md bg-surface px-3 py-1.5 border border-border/80 font-medium">
              🇮🇩 Base: Indonesia
            </span>
            <span className="rounded-md bg-surface px-3 py-1.5 border border-border/80 font-medium">
              🚀 Bootstrapped Early-Stage Startup
            </span>
            <span className="rounded-md bg-surface px-3 py-1.5 border border-border/80 font-medium">
              🤖 Anthropic Claude 3.5 Sonnet Ecosystem
            </span>
          </div>
        </div>

        {/* Mission & Vision Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-brand/30 bg-surface/90 p-6 sm:p-8 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand text-brand-fg">
                <Target className="size-5" />
              </div>
              <h2 className="text-xl font-bold">Misi Kami (Our Mission)</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
              <strong>Autonomous Financial Intelligence & Expense Management for Southeast Asia.</strong> Memberikan kejelasan finansial seketika tanpa kerumitan pencatatan manual, dengan tetap melindungi kerahasiaan dan privasi data pengguna melalui komputasi privat di perangkat.
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-surface/90 p-6 sm:p-8 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-fg">
                <Globe2 className="size-5" />
              </div>
              <h2 className="text-xl font-bold">Visi Kami (Our Vision)</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
              Menjadi standar platform finansial mandiri di Asia Tenggara di mana pengguna memiliki 100% kedaulatan atas data mutasi dan saldo mereka, dipandu oleh model penalaran AI kelas dunia yang objektif, transparan, dan bebas dari eksploitasi periklanan pihak ketiga.
            </p>
          </div>
        </div>

        {/* The Problem & Solution Story */}
        <section className="mt-14 space-y-6 rounded-2xl border border-border/80 bg-surface/70 p-6 sm:p-10">
          <div className="flex items-center gap-3">
            <Sparkles className="size-6 text-brand" />
            <h2 className="text-2xl font-bold tracking-tight">
              Mengapa Kami Membangun TrakingDuit?
            </h2>
          </div>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Di era digital saat ini, masyarakat di Asia Tenggara (khususnya Indonesia) memiliki rata-rata 3 hingga 5 rekening bank dan e-wallet berbeda (BCA, Mandiri, BRI, GoPay, OVO, ShopeePay, Dana). Namun, mengelola arus kas harian masih menjadi mimpi buruk:
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 text-xs sm:text-sm">
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-2">
              <h4 className="font-semibold text-fg flex items-center gap-2">
                <span className="size-2 rounded-full bg-rose-500" />
                Problem: Kelelahan Input Manual & Kebocoran Privasi
              </h4>
              <p className="text-muted leading-relaxed">
                Aplikasi keuangan umum seringkali mewajibkan pengguna mengetik setiap nominal secara manual, atau sebaliknya menyedot seluruh kredensial bank ke server terpusat yang rentan kebocoran data dan monetisasi iklan terselubung.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
              <h4 className="font-semibold text-fg flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500" />
                Solusi TrakingDuit: Local-First + Multimodal AI
              </h4>
              <p className="text-muted leading-relaxed">
                TrakingDuit menggabungkan <strong>Local-First Vault</strong> (data tersimpan di perangkat lokal pengguna) dengan <strong>Anthropic Claude 3.5 Sonnet</strong>. Nota belanja cukup difoto, diekstrak dalam 2 detik, dianalisis alokasi Safe-to-Spend-nya, tanpa data Anda dijual ke pihak ketiga.
              </p>
            </div>
          </div>
        </section>

        {/* Technology Architecture Section */}
        <section className="mt-14 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
              <Cpu className="size-3.5 text-brand" />
              <span>Technology & Architecture</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Arsitektur & Tumpukan Teknologi (Tech Stack)
            </h2>
            <p className="text-sm text-muted">
              Infrastruktur modern yang dibangun untuk performa, offline readiness, dan ketahanan data.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/80 bg-surface/80 p-6 space-y-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Lock className="size-5" />
              </div>
              <h3 className="font-bold text-fg">Local-First Vault</h3>
              <p className="text-xs text-muted leading-relaxed">
                Basis data IndexedDB klien dengan engine Dexie.js. Berfungsi 100% offline sebagai Progressive Web App (PWA) dengan enkripsi akses PIN 6-digit.
              </p>
            </div>

            <div className="rounded-2xl border border-brand/40 bg-surface/80 p-6 space-y-3 shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand text-brand-fg">
                <Cpu className="size-5" />
              </div>
              <h3 className="font-bold text-fg">Claude 3.5 Sonnet Engine</h3>
              <p className="text-xs text-muted leading-relaxed">
                Kecerdasan AI dari Anthropic untuk inferensi keuangan cerdas (Tradu AI), Safe-to-Spend runway forecasting, dan zero-shot multimodal receipt OCR scanning.
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface/80 p-6 space-y-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Code2 className="size-5" />
              </div>
              <h3 className="font-bold text-fg">Next.js & Capacitor</h3>
              <p className="text-xs text-muted leading-relaxed">
                Full-stack Next.js 15 App Router, React 19, TypeScript, dan Tailwind CSS v4. Didukung jembatan Capacitor untuk pengalaman aplikasi native Android.
              </p>
            </div>
          </div>
        </section>

        {/* Founder & Team Section */}
        <section className="mt-14 rounded-2xl border border-border/80 bg-surface/80 p-6 sm:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl border-2 border-brand bg-surface-2 shadow-sm">
              <div className="flex size-full items-center justify-center bg-gradient-to-br from-brand to-brand/70 text-2xl font-bold text-brand-fg">
                FL
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold text-fg">Farhan Lakoro</h3>
                <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                  Founder & Lead Architect
                </span>
              </div>
              <p className="text-xs text-muted font-medium">
                Software Engineer & Product Maker • Indonesia
              </p>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Farhan menginisiasi dan merancang TrakingDuit dengan fokus pada engineering excellence, arsitektur software berdaya tahan tinggi, dan pemanfaatan praktis frontier LLM seperti Claude 3.5 Sonnet untuk menyelesaikan gesekan finansial sehari-hari di Indonesia.
              </p>
              <div className="pt-2 flex items-center gap-3 text-xs">
                <a
                  href="mailto:founder@trakingduit.my.id"
                  className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                >
                  <Mail className="size-3.5" />
                  <span>founder@trakingduit.my.id</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Startup & Program Verification Details */}
        <section className="mt-14 rounded-2xl border border-border/80 bg-surface/70 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <Award className="size-5 text-brand" />
            <h2 className="text-xl font-bold tracking-tight">
              Profil Startup & Status Entitas
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted">
            Informasi entitas dan status verifikasi program akselerator / startup global:
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs sm:text-sm pt-2">
            <div className="rounded-xl border border-border/70 bg-surface p-4 space-y-1">
              <span className="text-muted">Nama Proyek / Startup:</span>
              <p className="font-bold text-fg">TrakingDuit</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface p-4 space-y-1">
              <span className="text-muted">Domain & URL Produksi:</span>
              <p className="font-bold text-brand">https://trakingduit.my.id</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface p-4 space-y-1">
              <span className="text-muted">Tahapan Pendanaan (Stage):</span>
              <p className="font-bold text-fg">Bootstrapped / Early Stage</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface p-4 space-y-1">
              <span className="text-muted">Fokus Industri:</span>
              <p className="font-bold text-fg">Fintech, Personal Finance Intelligence, Applied AI</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface p-4 space-y-1">
              <span className="text-muted">Program Partisipasi:</span>
              <p className="font-bold text-fg">Anthropic Startup Program & Global Developer Ecosystem</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface p-4 space-y-1">
              <span className="text-muted">Email Kontak Resmi:</span>
              <p className="font-bold text-brand">founder@trakingduit.my.id</p>
            </div>
          </div>
        </section>

        {/* Bottom CTA / Action */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border/80 bg-surface/90 p-6 sm:flex-row sm:p-8">
          <div>
            <h3 className="text-base font-bold text-fg sm:text-lg">
              Tertarik Berkolaborasi atau Mencoba TrakingDuit?
            </h3>
            <p className="text-xs text-muted">
              Jelajahi platform kami secara gratis langsung dari browser Anda tanpa instalasi rumit.
            </p>
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
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-brand-fg shadow-sm transition hover:brightness-110"
            >
              <span>Coba Demo Gratis</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
