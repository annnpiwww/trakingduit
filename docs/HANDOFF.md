# Session handoff — TrackingDuit

Paste isi blok di bawah ke session baru untuk melanjutkan tanpa kehilangan konteks.

> **UPDATE 2026-08-10 (v1.14.0):** project sekarang di `/home/annnpii/orca/trakingduit`,
> sudah repo git (branch `main`, author `annnpiwww <anpikeke@gmail.com>`, remote
> `github.com/annnpiwww/trakingduit.git`), live di https://trakingduit.vercel.app
> via Vercel CLI. Semua item §1–§3c lama sudah tuntas; ringkasan release v1.11.0–v1.14.0
> ada di §4b. Baca juga `docs/superpowers/plans/*` kalau mau konteks desain.

---

Lanjutkan pengerjaan webapp **TrackingDuit** di `/home/annnpii/orca/trakingduit`.
Acuan produk: `docs/PRD.md` (salinan `trackingduit.md`). Dokumentasi lengkap arsitektur ada di `README.md` — baca itu dulu sebelum mulai.

## Status: MVP + V2 sudah jadi dan terverifikasi

Next.js 16.2.11 App Router + Turbopack, React 19.2.4, TS 5.9, Tailwind v4, pnpm.
`pnpm build` bersih (24 rute), `tsc --noEmit` bersih, `eslint` 0 error / 14 warning (warning-nya
`react-hooks/set-state-in-effect` yang sengaja di-downgrade karena loading IndexedDB async memang butuh setState di effect).

Arsitektur: **Dexie/IndexedDB adalah source of truth di perangkat**; Supabase dan Google Sheets cuma target sinkronisasi.
Semua baris punya `id`/`created_at`/`updated_at`/`deleted` (soft delete) → sinkron dua arah last-write-wins.
Semua UI baca lewat `useLiveQuery`. App jalan penuh tanpa satu env var pun.

Semua integrasi opsional gagal secara eksplisit, bukan error: `/api/ocr`, `/api/insight`, `/api/sync/google-sheet`
balas **501 + hint `fallback`**, klien diam-diam turun ke Tesseract / insight rule-based / ekspor CSV.

Sudah selesai: 12 halaman (`dashboard, transactions, wallets, scan, budgets, goals, bills, analytics, insight, notifications, menu, settings`)
+ `/login`, 7 route API, `supabase/schema.sql` (11 tabel + RLS + trigger + view saldo + bucket storage),
PWA (manifest + `public/sw.js` tulis tangan), OCR client-side (tesseract.js `ind` + parser struk Indonesia),
impor mutasi CSV, backup/restore JSON, dan `scripts/smoke.mjs` (Playwright headless yang seed data lewat UI asli lalu screenshot 12 desktop + 5 mobile).

OCR sudah diverifikasi end-to-end pakai struk Indomaret sintetis: `merchant="INDOMARET" total=155955 date=2026-07-24`
(parser benar memilih TOTAL 155.955 di atas SUBTOTAL 140.500 dan TUNAI 200.000).

## Yang tersisa — kerjakan dari sini

### 1. ✅ Fix `cn()` terverifikasi (2026-07-26)

`tailwind-merge@3.6.0` + `cn()` = `twMerge(clsx(inputs))` sudah di-build dan diverifikasi:
`mobile-dashboard.png` MonthSwitcher tinggal satu.

Catatan output smoke dengan `SKIP_OCR=1`: tetap ada **1 × 501** — itu dari
`settings/page.tsx:91` yang auto-GET `/api/sync/google-sheet` saat mount (cek koneksi).
Expected by design (klien set `connected: false`); browser selalu log resource non-2xx
dan teks console 501 identik semua sehingga di-dedup jadi satu baris. Bukan regresi.
Ekspektasi realistis: **1 × 501**, bukan 0.

### 2. ✅ Semua screenshot sudah direview (2026-07-26)

17 screenshot direview, layout bersih. Dua temuan ditindak:

- Header `/notifications` dan `/menu` menampilkan "TrackingDuit" (fallback) —
  **fixed**: rute ditambah ke `ALL_NAV` di `app-shell.tsx` (title-only, tidak muncul di nav).
- Nit (dibiarkan): kartu BCA di `/wallets` badge-nya "Tunai" karena `smoke.mjs` seed
  wallet tanpa memilih tipe → default Tunai. Bukan bug UI; kalau mau rapi, smoke perlu
  pilih tipe "Bank" saat seed. Artefak lain: bottom nav nempel di tengah screenshot
  full-page mobile = perilaku elemen fixed di Playwright fullPage, bukan bug.

### 3. ✅ Supabase tersambung (2026-07-27)

Project user: `oeayigvhngzfimvbmyxg.supabase.co`. Kredensial terpasang di `.env.local`
(pakai format kunci baru `sb_publishable_…`, bukan JWT `anon` lama —
`@supabase/supabase-js@2.110.8` menerimanya di slot yang sama).

Terverifikasi lewat probe REST: 9 tabel (`wallets, categories, transactions,
budgets, saving_goals, bills, profiles, ocr_receipts, notifications`) semua balas
**200 + `[]`** untuk request tanpa auth — artinya schema sudah dijalankan dan RLS
aktif (menyembunyikan baris, bukan menolak koneksi). Build + smoke lolos dengan
env asli terpasang.

**Jebakan yang ditemukan dan ditutup:** project baru default `mailer_autoconfirm: false`.
`signUp()` mengembalikan `user` tapi `session === null`, dan `session.tsx` lama tetap
`setStatus("ready")` — app tampak sudah login padahal auto-sync melihat "tidak ada sesi"
lalu diam di mode lokal. Data tidak pernah naik, tanpa pesan error.
Sekarang `signInSupabase` melempar pesan eksplisit kalau `!data.session`.
Cek config auth project tanpa menulis apa pun: `GET /auth/v1/settings` (endpoint publik).

Sisa langkah ada di user: konfirmasi email lalu login, **atau** matikan
*Confirm email* di dashboard Authentication. Detail: [`docs/SUPABASE-SETUP.md`](SUPABASE-SETUP.md).

### 3b. Catatan implementasi auto-sync

Keputusan produk (2026-07-26): **Supabase jadi backend tetap.** Alasan user:
"app selalu online, data terintegrasi, tersimpan, ga bakalan ilang".
Google Sheets turun status jadi mirror opsional, bukan jalur data utama.

Yang dikerjakan session ini:

- **Auto-sync** (`src/lib/sync/auto-sync.tsx`, baru). Sebelumnya `syncSupabase()` cuma
  dipanggil tombol manual di Settings — tidak memenuhi "ga bakalan ilang".
  Sekarang dipicu: mount, interval 60 detik, event `online`, `focus`, dan
  `visibilitychange`. Gagal → backoff eksponensial 5 detik sampai maks 5 menit.
  Mutex `running` mencegah putaran tumpang tindih. Dipasang di `providers.tsx`
  di dalam `SessionProvider` (butuh `status`) dan `ToastProvider`.
- `syncSupabase()` dapat opsi `{ silent }`. Auto-sync memakainya supaya tidak
  spam notifikasi in-app, **dan** supaya `syncLogs` tidak tumbuh ~1440 baris/hari —
  log sukses di-skip kalau `silent && pushed === 0 && pulled === 0`.
- Badge status di Settings (`AUTO_SYNC_BADGE`): disabled/local/idle/syncing/offline/error.
- `smoke.mjs` diperbaiki: begitu env Supabase terisi, `login/page.tsx:25-27`
  auto-pindah ke tab "Akun Cloud" sehingga field nama lokal hilang dan smoke timeout.
  Sekarang smoke menunggu `[role="tablist"], input[placeholder="cth. Aan"]` lalu
  klik tab **Lokal** kalau ada. Catatan: `SegmentedControl` pakai `role="tab"`, bukan `button`.

Verifikasi: `tsc --noEmit` bersih, eslint 0 error / 14 warning (baseline), `pnpm build`
bersih, smoke lolos dengan env kosong maupun env asli terpasang. Output smoke tetap
**1 × 501** (dari cek `/api/sync/google-sheet`, lihat §1) — auto-sync tidak menambah
error karena smoke memakai mode lokal, jadi `getSession()` mengembalikan null dan
tidak ada satu pun network call ke Supabase.

### 3c. ✅ Live di Vercel (2026-07-27)

**Produksi: <https://trakingduit.vercel.app>** — perhatikan ejaan, **tanpa huruf c**.
Scope `anpikeke-6896`. Deploy lewat CLI langsung dari folder, **tanpa git/GitHub** —
folder ini masih bukan repo git. Detail + langkah ulang: [`docs/DEPLOY-VERCEL.md`](DEPLOY-VERCEL.md).

Project sudah di-rename jadi `trackingduit` (dengan c), tapi alias produksi baru
ikut pindah setelah `deploy --prod` berikutnya. Begitu pindah, **Supabase Site URL
+ Redirect URLs wajib diupdate ke domain baru**.

- `.vercelignore` wajib ada; tanpa itu `vercel deploy` mengunggah ~1.5 GB
  (`node_modules` 874M + `.next` 611M).
- `vercel link` **menambahkan `VERCEL_OIDC_TOKEN` ke `.env.local`** (append, tidak
  menimpa baris lain). Sudah dicek: dua var Supabase tetap utuh.
- Env `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` terpasang untuk
  production, preview, dan development.
- Verifikasi: build 24 rute, `/login` 200, URL Supabase terbukti ter-inline di
  `/_next/static/chunks/29ht3d9t8icz1.js`, `/api/sync/google-sheet` balas 501 sesuai
  desain, smoke produksi lolos dengan **1 × 501**.
- Run smoke pertama menunjukkan `net::ERR_FAILED` beberapa kali; run kedua bersih.
  Transien — warm-up edge cache/service worker pada deploy yang baru jadi. Bukan bug.

Sisa langkah manual di user: **Site URL** + **Redirect URLs** di Supabase Auth masih
`http://localhost:3000`, harus ditambah domain Vercel, kalau tidak link konfirmasi
email mengarah ke localhost.

### 4. Gap PRD yang sengaja belum dikerjakan (lihat README §Roadmap)

Open Banking (masih impor CSV), multi-user family (perlu tabel `households` + RLS berbasis keanggotaan),
push notification (perlu Web Push + VAPID), upload gambar struk ke bucket `receipts`.
Jangan mulai ini tanpa diminta.

**Bug diketahui, belum diperbaiki:** `signOut` menghapus profil lokal tapi tidak
menghapus tabel data. Kalau akun Supabase lain login di browser yang sama, baris
milik akun lama ikut ter-push ke akun baru pada sinkron pertama. Workaround
sementara sudah ditulis di `docs/SUPABASE-SETUP.md` (Reset semua data sebelum ganti akun).
Perbaikan sebenarnya: simpan `supabase_user_id` pemilik data dan bersihkan tabel
saat user berbeda login.

## 4b. Ringkasan release v1.11.0 – v1.14.0 (2026-08-09/10)

Semua sudah commit (branch `main`) + deploy Vercel production. Working tree bersih.

- **v1.11.0** — fitur Utang Piutang (`/debts`: form, bayar/terima auto-transaksi, sync +
migration `add_debts_table.sql`), tutorial onboarding, shortcut dashboard "Tanya Tradu" → "Utang Piutang".
- **v1.12.0** — tutorial install PWA (step akhir onboarding + item "Install Aplikasi" di Menu;
`usePWAInstall` singleton store + `InstallPrompt`/`InstallSheet`), tutorial onboarding dirombak
jadi **guided tour spotlight** (panah orange + tooltip per elemen, key localStorage `td.onboarded.v2`),
4 fix `/transactions` (sorting sebelum pagination, font stat mobile, month-switcher compact, hapus net + per-hari).
- **v1.13.0** — fix data-loss kritis di `session.tsx`: TIDAK `resetAll()` lagi saat re-login
akun cloud yang sama (cuma saat ganti akun, `supabase_user_id !== uid`); `signOut` cuma wipe
kalau sync terakhir sukses. Migration `fix_sync_apply_all.sql` (kolom installment bills + tabel
debts) sudah di-apply manual user ke Supabase remote.
- **v1.14.0** — sync profil dua arah (nama/warna avatar antar device, last-write-wins pakai
`updated_at`, `Date.parse()`). `avatar_url` TIDAK di-sync — kolom belum ada di remote `profiles`.

### 4c. Sisa pekerjaan / pending (belum diputus user)

1. User belum konfirmasi nama profil nyamain antar device setelah v1.14.0 (edit nama sekali di salah satu device).
2. **avatar_url sync** — perlu tambah kolom di remote `profiles` (SQL editor) + kode push/pull.
3. **signOut di mode lokal-only** masih wipe semua data tanpa backup (bisa diubah jadi tidak wipe).
4. Supabase Auth **Site URL / Redirect URLs** mungkin masih `http://localhost:3000` — cek dashboard
   Auth → URL Configuration kalau link konfirmasi email bermasalah.

Catatan infra: CLI `supabase db push` di mesin ini kena login-role 403 (akun CLI bukan pemilik
project `oeayigvhngzfimvbmyxg`) — jangan andalkan; untuk migration minta user paste SQL di SQL editor.

## Gotcha yang sudah kena, jangan diulang

- `pnpm` menolak build script → sudah diatur di `pnpm-workspace.yaml` (`allowBuilds` + `onlyBuiltDependencies` untuk sharp, unrs-resolver, tesseract.js).
- Playwright `waitUntil: "networkidle"` tidak pernah settle di Next; pakai `domcontentloaded`. Jalankan smoke terhadap `pnpm start`, bukan `pnpm dev` (kompilasi pertama `/login` sempat 59 detik gara-gara next/font/google).
- Screenshot mobile harus reuse browser context yang sama — context baru = IndexedDB kosong = kelempar ke `/login`. `smoke.mjs` sekarang pakai `page.setViewportSize()`.
- Server dev/prod harus dijalankan lewat background task tool; `nohup` di subshell ikut mati.
- `turbopack.root` di `next.config.ts` sengaja di-pin karena ada `package-lock.json` nyasar di `/home/annnpii`.

## Preferensi kerja

Bahasa campur Indo-English, terse, teknis. Agency tinggi: pecah tugas jadi langkah, eksekusi langkah low-risk
otomatis tanpa tanya. Auto-retry error maks 3×. Utamakan otomasi daripada langkah manual.
