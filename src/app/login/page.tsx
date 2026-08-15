"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "@/lib/session";
import { Button, Field, Input, SegmentedControl, Spinner } from "@/components/ui";

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
        if (pin && !/^\d{6}$/.test(pin)) throw new Error("PIN-nya 6 digit angka, ya");
        await signInLocal(name, pin || undefined);
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
        setError("Yah, gagal masuk");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-10"
      style={{ background: "var(--brand-grad)" }}
    >
      <div
        className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "#7cc4ff" }}
      />
      <div
        className="pointer-events-none absolute -bottom-28 -left-24 size-80 rounded-full opacity-15 blur-3xl"
        style={{ background: "#ff8a3d" }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo + greeting */}
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid size-16 place-items-center overflow-hidden rounded-2xl bg-white/15 shadow-lg backdrop-blur-sm ring-1 ring-white/20">
            <Image
              src="/icons/logo.png"
              alt="TrakingDuit"
              width={512}
              height={512}
              priority
              className="size-full object-cover"
            />
          </span>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Hai, Selamat Datang!
          </p>
          <p className="mt-2 text-sm text-white/80">
            Catat duit, pantau pengeluaran, wujudkan target.
          </p>
        </div>

        {/* Floating card */}
        <form onSubmit={submit} className="space-y-4 rounded-3xl bg-surface p-6 shadow-(--shadow-pop)">
          <p className="text-xs text-muted">
            {supabaseEnabled
              ? "Pakai akun untuk sinkron di semua perangkat, atau lanjut dalam mode offline."
              : "Mode offline aktif — data kamu hanya tersimpan di browser ini."}
          </p>

          {supabaseEnabled ? (
            <SegmentedControl
              className="w-full"
              value={mode}
              onChange={setMode}
              options={[
                { value: "cloud", label: "Pakai Akun" },
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
                  placeholder="Kamu mau dipanggil siapa?"
                  autoComplete="nickname"
                />
              </Field>
              <Field label="PIN 6 digit (kalau mau)" hint="Opsional - biar aman banget.">
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="······"
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
            className="w-full bg-[linear-gradient(135deg,#003d7a,#0060af)] text-white shadow-lg shadow-brand/25"
            loading={busy}
          >
            {mode === "cloud" && cloudMode === "register" ? "Daftar" : "Masuk"}
          </Button>

          {mode === "cloud" ? (
            <button
              type="button"
              onClick={() => setCloudMode((m) => (m === "login" ? "register" : "login"))}
              className="w-full text-center text-xs text-muted transition hover:text-fg"
            >
              {cloudMode === "login" ? "Belum punya akun? Daftar di sini" : "Sudah punya akun? Masuk saja"}
            </button>
          ) : null}
        </form>

        <p className="mt-6 text-center text-xs text-white/70">
          Data aman tersimpan di perangkat kamu.
        </p>
      </div>
    </div>
  );
}
