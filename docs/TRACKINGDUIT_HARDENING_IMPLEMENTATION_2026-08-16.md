# TrackingDuit — Laporan Implementasi Hardening

**Tanggal:** 16 Agustus 2026  
**Workspace:** `/home/ubuntu/trackingduit-work`  
**Status:** Selesai di source dan test; **belum di-deploy ke production**.

## Ringkasan

Hardening ini menerjemahkan hasil audit TrackingDuit menjadi perubahan yang tetap mempertahankan arsitektur Next.js + Supabase + Dexie. Fokusnya adalah menjaga kepercayaan pengguna: batas API lebih ketat, isolasi data wallet diperbaiki, perhitungan finansial lebih jujur, mutation tidak mudah ter-submit dua kali, dan dashboard sekarang membawa janji produk **“tahu uang aman sampai akhir bulan”**.

Perubahan dikerjakan di workspace terisolasi. Source asli di `/home/ubuntu/trackingduit-src` tidak diubah dan tidak ada operasi deploy atau perubahan data production dalam fase implementasi ini.

## Perubahan yang Diimplementasikan

| Area | Implementasi | Dampak |
|---|---|---|
| Login security | Rate limit persisten per kombinasi client + email: 5 percobaan per 5 menit; respons `429`, `Retry-After`, dan `X-RateLimit-Remaining` | Brute-force login tidak lagi bebas mencoba pada instance serverless yang berbeda |
| Tradu | Schema ketat: hanya role `user`/`assistant`, maksimal 50 pesan, maksimal 5.000 karakter per pesan; limiter 20 request/menit/client | Mengurangi prompt injection berbasis role dan payload berlebihan sebelum provider dipanggil |
| OCR | Hanya menerima data URL JPEG, PNG, atau WebP; ukuran payload tetap dibatasi; limiter 60 request/menit/client | Menolak payload non-image dan mengurangi penyalahgunaan provider vision |
| Rate-limit privacy | Key limiter di-hash SHA-256 sebelum dikirim ke Supabase | Email dan alamat client tidak disimpan mentah di bucket limiter |
| Persistence limiter | Tabel `rate_limit_buckets` + RPC atomic `consume_rate_limit` dengan `SECURITY DEFINER`, validasi input, dan least-privilege grants | Throttling konsisten lintas instance serverless setelah migration diterapkan |
| Wallet isolation | View `wallet_balances` memakai `security_invoker`, predicate `auth.uid()` pada wallet dan transaction, serta anonymous access dicabut | Menutup temuan P0 cross-tenant exposure pada view aggregate |
| Bills salary | Salary `Rp0` atau belum diatur sekarang menjadi state eksplisit “Gaji belum diatur”, tanpa persentase palsu atau sisa negatif yang membingungkan | Ringkasan bulan lebih jujur |
| Debt date | Due date kosong tidak lagi dirender sebagai `null hari lagi` | State tanpa deadline terbaca jelas |
| Mutation UX | Sheet bills, salary, debts, budget, goals, dan payment diberi pending guard serta close/reset setelah sukses | Mengurangi stale modal dan double-submit |
| Bill payment | Payment key deterministik per bill dan hari berjalan, ditambah guard local transaction | Klik ulang pada hari yang sama tidak membuat transaksi expense duplikat |
| Account privacy | Session transition membandingkan identity key local/cloud dan membersihkan Dexie saat akun berganti | Data offline akun sebelumnya tidak tertinggal saat account switch |
| Safe-to-spend | Dashboard menghitung saldo bebas setelah tagihan, reserve goal bertanggal, dan safety buffer; menampilkan batas per hari, status, confidence, dan alasan | Headline produk punya manfaat langsung, bukan sekadar slogan |
| Copy | Label moralizing/alarmist yang tersisa diganti status faktual dan actionable | Nada lebih suportif untuk target Gen Z Indonesia |
| Quality gate | Vitest ditambahkan sebagai script `pnpm test`; lint scope mengecualikan docs, tests, migration tooling, dan standalone scripts | Regression suite dapat dijalankan lewat command standar |

## Model Safe-to-Spend

Kalkulasi dashboard memakai bentuk konservatif berikut:

> **Uang aman dipakai = saldo bulan ini − tagihan belum dibayar − reserve target bertanggal − safety buffer**

Reserve target dihitung dari shortfall target dibagi jumlah bulan sampai deadline, minimal satu bulan. Nilai tidak pernah dibuat negatif. Jika gaji belum dikonfigurasi atau data komitmen belum lengkap, dashboard menurunkan confidence menjadi `low` dan menampilkan alasan, bukan mengklaim kepastian palsu.

Copy utama yang dipakai di dashboard adalah **“Aman dipakai sampai akhir bulan”**, dengan batas kira-kira per hari dan rincian apa yang sudah dicadangkan.

## Migration Supabase

Dua migration baru dibuat melalui pola Supabase migration:

- `supabase/migrations/20260816033933_fix_wallet_balances_rls.sql`
- `supabase/migrations/20260816040210_add_persistent_rate_limit.sql`

Canonical schema juga diperbarui agar environment baru tidak menghidupkan kembali view atau rate-limit object yang rentan.

Migration belum dijalankan ke production. Sebelum release, migration perlu direview lalu dijalankan pada staging/linked project dengan urutan normal Supabase. Setelah itu, verifikasi dengan akun non-admin yang memiliki dua user fixture berbeda untuk memastikan `wallet_balances` hanya mengembalikan wallet milik `auth.uid()`.

## Regression Coverage

Test baru mencakup:

| Suite | Coverage |
|---|---|
| `tests/api/security-boundaries.test.ts` | Limiter, role Tradu, panjang pesan, MIME OCR, dan batas payload |
| `tests/api/login-rate-limit.test.ts` | Login route mengembalikan 429 pada percobaan ke-6 |
| `tests/api/tradu-validation.test.ts` | Role unsafe ditolak sebelum provider dipanggil |
| `tests/api/ocr-rate-limit.test.ts` | OCR provider throttled setelah limit tercapai |
| `tests/api/persistent-rate-limit.test.ts` | RPC dipakai, key disimpan sebagai hash, dan fallback tetap bekerja |
| `tests/supabase/wallet-balances-migration.test.ts` | `security_invoker`, owner predicate, dan grant view |
| `tests/supabase/rate-limit-migration.test.ts` | Table, atomic RPC, validation, dan client-role denial |
| `tests/bills/salary-summary.test.ts` | State salary kosong/zero dan payment key |
| `tests/debts/debt-status.test.ts` | Label tanpa due date |
| `tests/dashboard/safe-to-spend.test.ts` | Bills, goals, buffer, confidence, dan edge cases |
| `tests/domain/money-safety.test.ts` | Domain status, reasons, per-day, dan overcommitment |
| `tests/session/account-isolation.test.ts` | Local/cloud account switch dan same-account re-entry |

## Final Verification Evidence

| Check | Hasil |
|---|---:|
| `pnpm test` | **PASS** — 12 test files, 30 tests |
| `pnpm exec tsc --noEmit` | **PASS** |
| `pnpm lint` | **PASS** — 0 errors, 44 warnings |
| `pnpm build` | **ENVIRONMENT BLOCKED** — Next compiled successfully, lalu Node OOM saat phase “Running TypeScript” dengan heap 1.5 GB |

Build failure bukan compile error dari source: build mencapai `Compiled successfully in 22.3s`; proses berhenti karena keterbatasan memory sandbox. TypeScript standalone tetap pass. Ada juga warning Next bahwa convention `middleware` akan diganti `proxy` pada versi mendatang; ini bukan bagian dari hardening dan tidak memblokir perubahan.

## Review Checkpoint Sebelum Deploy

1. Review diff di `/home/ubuntu/trackingduit-work`, khususnya dua migration dan route limiter.
2. Jalankan migration pada staging atau linked Supabase project, bukan production terlebih dahulu.
3. Ulangi RLS isolation test dengan dua identity berbeda.
4. Cek Vercel build pada environment deployment yang memory-nya memadai.
5. Setelah review eksplisit disetujui, baru commit, push, deploy, dan smoke-test production.

**Keputusan saat ini:** source dan regression suite siap untuk review user. **Tidak ada deploy production yang dilakukan.**
