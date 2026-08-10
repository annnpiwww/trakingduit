# NEXT_STEPS — TrackingDuit (session continuation)

> Dibuat: 2026-08-10 · Session: setup domain + audit project + fix bug sync.
> **Cara pakai:** paste isi file ini ke session AI berikutnya (Claude/DeepSeek/Kimi) sebagai konteks awal.

## 📌 Status terakhir

| Item | Status |
|---|---|
| Domain `trakingduit.my.id` (apex + www) | ✅ LIVE di Vercel, SSL valid, redirect ke `/dashboard` |
| Vercel project | ✅ `trackingduit` (projectId `prj_kd6D7S6M55Tk0Extkq6r909OVFfB`) |
| Supabase Site URL | ✅ `https://trakingduit.my.id` |
| Supabase Redirect URLs | ✅ `trakingduit.my.id/**`, `www.trakingduit.my.id/**`, `localhost:3000/**` |
| Migration `avatar_url` | ✅ **BARU DI-APPLY** via Management API (kolom ada di remote) |
| Bug signOut data loss | ✅ **BARU DI-FIX** di `src/lib/session.tsx` (lokal-only tidak wipe data) |
| Version app | `1.17.1` (belum di-bump, belum di-deploy, belum di-commit) |

**PENTING — perubahan yang BELUM di-commit/deploy:**
- `src/lib/session.tsx` — fix signOut (perlu `pnpm build` + deploy + commit)
- Token PAT Supabase `sbp_4869...` **belum di-revoke** (aman sih, tapi mending di-revoke di dashboard setelah session ini)

## 🔑 Akses penting

- **Git remote:** `https://github.com/annnpiwww/trakingduit.git` (branch `main`)
- **Vercel CLI:** login sebagai `anpikeke-6896`, project scope `hermessd`
- **Supabase project:** `oeayigvhngzfimvbmyxg` (nama `trackingduit`)
- **Supabase CLI lokal:** login-role 403 → jangan andalkan `supabase db push`; pakai **Management API**:
  ```bash
  # Query SQL ke database remote (pakai file biar aman dari escaping):
  curl -s -X POST -H "Authorization: Bearer <PAT>" -H 'Content-Type: application/json' \
    --data-binary @payload.json "https://api.supabase.com/v1/projects/oeayigvhngzfimvbmyxg/database/query"
  # payload.json: {"query":"SELECT ..."}
  # Config auth: GET/PATCH https://api.supabase.com/v1/projects/<ref>/config/auth
  ```
- **Supabase Auth config** sudah benar: `mailer_autoconfirm: true` (email confirm mati), signup jalan.

## ⚠️ Bug yang BELUM di-fix (dari HANDOFF)

1. **SignOut antar akun cloud:** `signOut` wipe data lokal kalau sync sukses → akun lain di browser sama bisa lihat data lama. Sudah difix SEBAGIAN (wipe cuma kalau `cloudUser && synced`), tapi **perlu test manual**: login cloud A → signout → login cloud B → pastikan data B bersih.
2. **Domain naming `trakingduit` vs `trackingduit`:** kode UI masih ada `alt="TrakingDuit"` di `src/app/login/page.tsx:85` dan `src/components/layout/app-shell.tsx:180`, plus prompt AI `src/app/api/tradu/route.ts:50` → "Tradu (Trakingduit)". Belum diganti.
3. **GitHub repo masih bernama `trakingduit`** — belum di-rename.

## 🎯 Prioritas berikutnya (rekomendasi)

1. **Commit + deploy fix signOut** (langkah di bawah)
2. **Ganti `Traking` → `Tracking`** di 3 file kode (login, app-shell, tradu route) + `package.json` name + `scripts/auto-sync.sh` — HATI-HATI: `lib/db.ts` pakai `super("trackingduit")` (DB name, JANGAN diubah), `lib/import.ts` cek `app: "trackingduit"` (JANGAN diubah).
3. **Test suite** — 0 file test sekarang. Mulai dari kalkulasi saldo/budget di `src/lib/analytics.ts`.
4. **Sentry/monitoring** — belum ada error tracking.
5. **Push notification** — PRD gap, butuh Web Push + VAPID.

## 🚀 Deploy flow (pakai skill `updateversion`)

```bash
# 1. Git profile valid (wajib, kalau tidak Vercel block deploy):
git config user.email "anpikeke@gmail.com"
git config user.name "annnpii"
# 2. Bump versi: package.json + src/app/(app)/menu/page.tsx (baris "TrackingDuit vX.Y.Z")
# 3. Build & typecheck:
pnpm build && npx tsc --noEmit
# 4. Deploy produksi:
vercel --prod --yes
# 5. Commit + push:
git add -A && git commit -m "..." && git push origin main
```

## 📁 Struktur kunci

- `src/lib/session.tsx` — auth lokal/cloud, signIn/signOut, profil sync
- `src/lib/sync/supabase-sync.ts` — sinkron dua arah, LWW `updated_at`
- `src/lib/db.ts` — Dexie schema (JANGAN ubah nama DB `trackingduit`)
- `src/lib/analytics.ts` — agregasi murni (dipakai UI + API)
- `supabase/migrations/` — SQL yang perlu di-apply manual / via API
- `docs/HANDOFF.md` — konteks lengkap sesi sebelumnya (baca juga ini)

## ✅ Sudah diverifikasi session ini

- `trakingduit.my.id` apex → 200, www → 307→dashboard
- Supabase REST health: 401 (normal, butuh auth), `/auth/v1/settings` OK
- Migration avatar_url: kolom terverifikasi di `information_schema`
- Env Vercel: `NEXT_PUBLIC_SUPABASE_URL` + `_ANON_KEY` ada di Prod/Preview/Dev
