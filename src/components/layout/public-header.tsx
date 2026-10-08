"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Menu, X, ArrowRight, ShieldCheck } from "lucide-react";
import { useTheme } from "@/lib/theme";

interface PublicHeaderProps {
  currentPath?: string;
}

export function PublicHeader({ currentPath }: PublicHeaderProps) {
  const pathname = usePathname() || currentPath || "/";
  const { theme, toggle } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navLinks = [
    { label: "Beranda", href: "/" },
    { label: "Tentang Kami", href: "/about" },
    { label: "Kebijakan Privasi", href: "/privacy" },
    { label: "Ketentuan Layanan", href: "/terms" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-bg/80 backdrop-blur-xl transition-colors">
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
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition ${
                  isActive
                    ? "text-brand font-semibold"
                    : "text-muted hover:text-fg"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Action CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          {/* Theme Toggle Button */}
          <button
            onClick={toggle}
            aria-label="Ubah Tema"
            className="flex size-9 items-center justify-center rounded-xl border border-border/80 bg-surface text-muted transition hover:border-border hover:bg-surface-2 hover:text-fg"
          >
            {theme === "dark" ? (
              <Sun className="size-4 text-amber-400" />
            ) : (
              <Moon className="size-4 text-slate-700" />
            )}
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
            {theme === "dark" ? (
              <Sun className="size-4 text-amber-400" />
            ) : (
              <Moon className="size-4 text-slate-700" />
            )}
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
            className="border-b border-border/80 bg-surface px-4 py-4 md:hidden"
          >
            <div className="flex flex-col gap-3">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    pathname === item.href
                      ? "bg-brand/10 font-semibold text-brand"
                      : "text-muted hover:bg-surface-2 hover:text-fg"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-3">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-10 items-center justify-center rounded-xl border border-border/80 bg-surface-2 text-sm font-medium text-fg"
                >
                  Masuk Akun
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-brand-fg shadow-sm"
                >
                  <span>Buka Dashboard</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
