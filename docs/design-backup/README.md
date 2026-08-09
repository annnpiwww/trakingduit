# Design Backup — Dashboard (2026-08-09)

## Status akhir (keputusan user)

Dashboard **balik ke tampilan asli** + **2 fitur tambahan** yang disukai dari redesign:

1. **Background "Rp"** raksasa di kartu saldo (watermark).
2. **Mood chip** di kartu saldo — dihitung dari data asli (sisa ÷ pemasukan):
   🤑 Duit aman · 😌 Aman, tahan dikit dong · 🤏 **Nyaris abis, sabar** · 🔥 Waduh minus · 👀 Belum ada catatan.

Implementasi: `src/app/(app)/dashboard/page.tsx` (asli + mood) dan prop opsional
`watermark` + `chip` di `BalanceCard` (`src/components/ui/index.tsx`).

## Isi folder

| File | Keterangan |
| --- | --- |
| `2026-08-09-dashboard-page-asli.tsx.bak` | Halaman dashboard **asli** (persis sebelum redesign) |
| `redesign-2026-08-09/*.tsx.bak` | Arsip **redesign bento** yang diganti (balance-hero, cashflow-mini, category-donut, page baru) |
| `screenshots/before/` | 18 screenshot (desktop+mobile) versi **lama** |
| `screenshots/after/` | 18 screenshot (desktop+mobile) versi **saat ini** (asli + watermark + mood) |

> File backup sengaja di-ext `.tsx.bak` supaya tidak ikut di-compile TypeScript/Next.

## Cara balik ke versi lain

```bash
# ke tampilan asli tanpa fitur tambahan (restore point git)
git checkout 85b495a -- "src/app/(app)/dashboard/page.tsx"
git checkout 85b495a -- src/components/ui/index.tsx   # kalau mau BalanceCard polos juga

# ke redesign bento (kalau pengen coba lagi)
cp "docs/design-backup/redesign-2026-08-09/dashboard-page-baru.tsx.bak" \
   "src/app/(app)/dashboard/page.tsx"
mkdir -p src/components/dashboard
cp "docs/design-backup/redesign-2026-08-09/balance-hero.tsx.bak" src/components/dashboard/balance-hero.tsx
cp "docs/design-backup/redesign-2026-08-09/cashflow-mini.tsx.bak" src/components/dashboard/cashflow-mini.tsx
cp "docs/design-backup/redesign-2026-08-09/category-donut.tsx.bak" src/components/dashboard/category-donut.tsx
# (renama ulang ke .tsx dulu kalau mau)
```
