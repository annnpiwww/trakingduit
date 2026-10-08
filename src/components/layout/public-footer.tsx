"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ShieldCheck, Heart } from "lucide-react";

export function PublicFooter() {
  return (
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
              Platform kecerdasan finansial personal generasi baru berbasis Local-First Vault dan Claude 3.5 Sonnet.
              Dirancang untuk transparansi arus kas, privasi mutlak, dan efisiensi finansial di Asia Tenggara.
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
            <div className="mt-2 flex items-center gap-2 text-xs text-muted">
              <ShieldCheck className="size-4 text-emerald-500" />
              <span>Zero Public Training • Client-Side Encryption</span>
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

          {/* Col 3: Keamanan */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Keamanan</h4>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              <li>
                <Link href="/privacy" className="transition hover:text-fg">
                  Local-First Vault
                </Link>
              </li>
              <li>
                <Link href="/privacy#encryption" className="transition hover:text-fg">
                  Enkripsi PIN 6 Digit
                </Link>
              </li>
              <li>
                <Link href="/privacy#ai-governance" className="transition hover:text-fg">
                  AI Zero Data Retention
                </Link>
              </li>
              <li>
                <Link href="/privacy#data-rights" className="transition hover:text-fg">
                  Export Data (CSV/JSON)
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Perusahaan & Legalitas */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Legalitas & Info</h4>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              <li>
                <Link href="/about" className="transition hover:text-fg">
                  Tentang Kami (About)
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
            <span className="flex items-center gap-1">
              Dibangun dengan <Heart className="size-3 fill-rose-500 text-rose-500" /> untuk Asia Tenggara
            </span>
            <span>•</span>
            <span className="font-mono text-[11px]">v1.33.4</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
