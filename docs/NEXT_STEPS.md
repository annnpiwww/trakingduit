# NEXT_STEPS — TrackingDuit (session continuation)

> Dibuat: 2026-08-11 · Session: tunning Tradu + koneksi AI via OmniRoute Tailscale Funnel + audit bug + monetisasi.
> **Cara pakai:** paste isi file ini ke session AI berikutnya sebagai konteks awal.

## 📌 Status terakhir

| Item | Status |
|---|---|
| Domain `trakingduit.my.id` | ✅ LIVE di Vercel |
| Vercel project | ✅ `trackingduit` (projectId `prj_kd6D7S6M55Tk0Extkq6r909OVFfB`) |
| Version app | `v1.17.2` (package.json + menu page) |
| Commit terakhir | `a6a5cad` — feat(tradu): tunning + enrich context + fix TS error + quick prompts Gen Z |
| Git working tree | ✅ Bersih, pushed ke `origin/main` |

## 🧠 AI (Tradu & OCR) — Infrastruktur

**OmniRoute** via Tailscale Funnel ✅ (stable, public internet):
- URL: `https://hermesagent.tailcb6f2e.ts.net/v1` (OpenAI-compatible)
- Proxy: `http://127.0.0.1:20129` (OmniRoute backend di Proxmox)

**Model yg dipake:**
| Feature | Model | Waktu |
|---|---|---|
| Tradu (chat) | `ollama-cloud/gemma4:31b` | ~9-15 detik |
| OCR (scan struk) | `ollama-cloud/gemma4:31b` | ~11 detik |

**Env Vercel production:**
| Variable | Value |
|---|---|
| `TRADU_API_URL` | `https://hermesagent.tailcb6f2e.ts.net/v1` |
| `TRADU_API_KEY` | `omniroute-local` **(dummy — ganti kalau auth diaktifkan!)** |
| `TRADU_MODEL` | `ollama-cloud/gemma4:31b` |
| `OCR_API_URL` | `https://hermesagent.tailcb6f2e.ts.net/v1` |
| `OCR_API_KEY` | `omniroute-local` **(dummy)** |
| `OCR_MODEL` | `ollama-cloud/gemma4:31b` |

## ✅ Perubahan session ini

1. **Security fix** — hapus hardcoded API key `sk-23a97...` & URL tunnel trycloudflare dari `tradu/route.ts` & `ocr/route.ts` (pindah 100% ke env)
2. **OCR timeout naik** 30s → 55s (model self-hosted emang lambat)
3. **OCR parse toleran** — `parseOcrText` selalu balas `raw_text`, structured best-effort → client pake text AI walau structured kosong
4. **Tradu strip "Thinking Process"** — `stripThinkingProcess()` di server otomatis buang blok reasoning
5. **Tradu tuning sistem prompt** — framework 4 langkah: hitung angka → deteks anomali → rekomendasi spesifik → akui keterbatasan data
6. **Rich financial context di client** — `avgDailySpend`, `projectedMonthEnd`, `lastMonthExpense` + delta, `budgetUsage` (%, `upcomingBills` (7 hari), `savingsRate`
7. **Quick Prompts Gen Z** — "Duitku aman gak bulan ini?", "Kategori mana yang paling bikin tekor?", "Kasih tips hemat minggu ini dong", "Cara capai target nabung gimana?"
8. **Fix 4 bug dari audit** — backup/restore debts+salaries, resetAll salaries, nextDueDate monthly clamp, budget 0 guard

## ⚠️ Yang PERLU dilanjut session depan

### 1. 🔒 Aktifkan auth di OmniRoute (prioritas!)
- Buka `https://hermesagent.tailcb6f2e.ts.net/home` atau `http://100.106.72.4:20129/home`
- Cari menu Settings / Access & Security / API Keys
- Buat gateway API key → kasih tau Buffy → dia set `TRADU_API_KEY` & `OCR_API_KEY` di Vercel
- **Kenapa penting?** OmniRoute sekarang kebuka publik tanpa auth — siapa pun yang tau URL Funnel bisa manggil AI lo gratis!

### 2. 🎯 Monetisasi — Tradu Premium & OCR limit (diskusi dari user)

**Pertanyaan user:** Tradu dijadikan fitur premium/subscription, OCR 5x/hari gratis, premium unlimited.

**Rekomendasi dari Buffy:** (lihat konten lengkap di session sebelumnya — 3 tier: Free / Premium Basic / Premium Pro, implementasi pakai Supabase custom claims + middleware cek)

### 3. 🔧 M3 (minimax-m3) model
- `oc/minimax-m3` & `opencode/minimax-m3` gagal 401 — butuh API key provider sendiri di dashboard OmniRoute
- Kalau lo tambahin kredensial provider M3, ganti `TRADU_MODEL` → `oc/minimax-m3` (lebih cepat & akurat dari Gemma)

### 4. 🔄 Rename `traking` → `tracking`
- Kode UI: `src/app/login/page.tsx:85` (alt="TrakingDuit")
- `src/components/layout/app-shell.tsx:180`
- `src/app/api/tradu/route.ts:50` (prompt: "Tradu (Trakingduit)")
- GitHub repo name belum di-rename
- **JANGAN ubah:** `lib/db.ts` DB name `trackingduit`, `lib/import.ts` app key `trackingduit`

### 5. 🔧 Quick fixes pending
- Rate limit in-memory → bisa di-bypas multi-instance Vercel. Butuh Upstash/Redis untuk produksi serius
- Test suite: 0 file test. Minimal untuk `src/lib/analytics.ts` (kalkulasi saldo/budget)

## 🚀 Deploy flow

```bash
pnpm build && npx tsc --noEmit && vercel --prod --yes
git add -A && git commit -m "..." && git push origin main
```

## 🔑 Akses penting

- **Git remote:** `https://github.com/annnpiwww/trakingduit.git` (branch `main`)
- **Vercel CLI:** login `anpikeke-6896`, scope `hermessd`
- **Supabase project:** `oeayigvhngzfimvbmyxg`
- **OmniRoute (via Tailscale Funnel):** `https://hermesagent.tailcb6f2e.ts.net`
- **OmniRoute (lokal tailnet):** `http://100.106.72.4:20129`
- **PAT Supabase `sbp_4869...`** — **revoke di dashboard!** Udah dipake buat migration.