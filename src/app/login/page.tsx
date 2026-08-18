"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "@/lib/session";
import { Button, Field, Input, SegmentedControl, Spinner } from "@/components/ui";
import {
  BuntingFlagsSVG,
  WavingFlagSVG,
  RedWhiteRibbonSVG,
} from "@/components/ui/indonesia-decorations";

export default function LoginPage() {
  const { status, supabaseEnabled, signInLocal, signInSupabase } = useSession();
  const router = useRouter();
  const [mode, setMode] = React.useState<"local" | "cloud">("local");
  const [name, setName] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [cloudMode, setCloudMode] = React.useState<"login" | "register">("login");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (status === "ready" || status === "locked") router.replace("/dashboard");
  }, [status, router]);

  React.useEffect(() => {
    if (supabaseEnabled) setMode("cloud");
  }, [supabaseEnabled]);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-6 text-white" />
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "cloud") {
        await signInSupabase(email.trim(), password, cloudMode);
      } else {
        if (pin && !/^\d{6}$/.test(pin)) throw new Error("PIN-nya 6 digit angka ya");
        await signInLocal(name, pin || undefined);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("td:login_success"));
      }
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
          setError("Username atau password salah, coba lagi");
        } else {
          setError(err.message);
        }
      } else {
        setError("Gagal masuk nih");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-10 bg-gradient-to-br from-red-600 via-rose-600 to-red-700">
      {/* Background Ornaments */}
      <div
        className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-red-400/25 opacity-40 blur-3xl"
      />
      <div
        className="pointer-events-none absolute -bottom-28 -left-24 size-80 rounded-full bg-rose-500/20 opacity-30 blur-3xl"
      />

      {/* Top Banner Ribbon Accent */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 flex justify-center opacity-85">
        <RedWhiteRibbonSVG className="h-6 w-auto" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo + greeting & 17 Agustus Branding */}
        <div className="mb-6 flex flex-col items-center text-center">
          {/* Badge Dirgahayu / HUT RI */}
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-gradient-to-r from-red-600/30 via-rose-600/30 to-red-700/30 px-3.5 py-1 text-xs font-semibold text-white shadow-md backdrop-blur-md ring-1 ring-white/20">
            <WavingFlagSVG className="size-4" />
            <span className="font-extrabold text-red-200">HUT RI 🇮🇩</span>
            <span className="text-white/40">•</span>
            <span className="text-white/90">Dirgahayu Indonesia</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="grid size-14 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 to-red-700 shadow-xl backdrop-blur-sm ring-2 ring-white/30">
              <Image
                src="/icons/logo.png"
                alt="TrakingDuit"
                width={512}
                height={512}
                priority
                className="size-full object-cover"
              />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              TrakingDuit
            </h1>
          </div>

          <p className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Hai, Selamat Datang!
          </p>
          <p className="mt-1.5 text-sm text-white/80">
            Catat duit, pantau pengeluaran, wujudkan target.
          </p>
        </div>

        {/* Floating card with Bunting Flags Decoration */}
        <div className="relative overflow-hidden rounded-3xl border border-red-500/30 bg-surface p-6 shadow-(--shadow-pop) transition-all hover:border-red-500/60">
          {/* Bunting Flags Decoration on Top of Login Card */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 overflow-hidden">
            <BuntingFlagsSVG className="h-7 w-full" />
          </div>

          <form onSubmit={submit} className="relative z-20 pt-3 space-y-4">
            <p className="text-xs text-muted">
              {supabaseEnabled
                ? "Pake akun buat sync di semua device, atau mode offline aja."
                : "Mode offline aktif - data kamu cuma ada di browser ini."}
            </p>

            {supabaseEnabled ? (
              <SegmentedControl
                className="w-full border-red-500/30 hover:border-red-500/60"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "cloud", label: "Pake Akun" },
                  { value: "local", label: "Offline Aja" },
                ]}
              />
            ) : null}

            {mode === "cloud" ? (
              <>
                <Field label="Email">
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kamu@email.com"
                    autoComplete="email"
                    className="border-red-500/30 hover:border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </Field>
                <Field label="Password">
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={cloudMode === "login" ? "current-password" : "new-password"}
                    className="border-red-500/30 hover:border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Nama kamu">
                  <Input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama kamu siapa?"
                    autoComplete="nickname"
                    className="border-red-500/30 hover:border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </Field>
                <Field label="PIN 6 digit (kalo mau)" hint="Opsional - biar aman banget.">
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="······"
                    className="border-red-500/30 hover:border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </Field>
              </>
            )}

            {error ? (
              <p className="rounded-xl border border-expense/30 bg-expense/10 px-3 py-2 text-xs text-expense">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full border-0 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md shadow-red-500/20 font-bold tracking-wide"
              loading={busy}
            >
              {mode === "cloud" && cloudMode === "register" ? "Daftar Akun Baru 🇮🇩" : "Masuk ke TrakingDuit 🇮🇩"}
            </Button>

            {mode === "cloud" ? (
              <button
                type="button"
                onClick={() => setCloudMode((m) => (m === "login" ? "register" : "login"))}
                className="w-full text-center text-xs text-muted transition hover:text-fg"
              >
                {cloudMode === "login" ? "Belum punya akun? Daftar di sini" : "Udah punya akun? Masuk aja"}
              </button>
            ) : null}
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/70">
          Data aman tersimpan di perangkat kamu. 🇮🇩 Merdeka!
        </p>
      </div>
    </div>
  );
}
