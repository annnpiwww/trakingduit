# Design Backup — Redesign Dashboard (2026-08-09)

Simpanan versi **sebelum** redesign dashboard, biar gampang balik kalau hasilnya
nggak sesuai selera.

## Isi

| File | Keterangan |
| --- | --- |
| `2026-08-09-dashboard-page-asli.tsx` | `src/app/(app)/dashboard/page.tsx` persis sebelum redesign |

## Cara balik ke versi lama

Ada 2 jalur (bebas pilih):

### 1. Lewat git (paling gampang)

Backup ini di-commit sebagai restore point di `main` (lihat log git). Untuk
balikin dashboard ke versi lama:

```bash
git log --oneline -5              # cari commit "chore: backup dashboard sebelum redesign"
git checkout <commit> -- "src/app/(app)/dashboard/page.tsx"
# lalu hapus komponen baru kalau mau:
rm -rf src/components/dashboard
git checkout <commit> -- docs/design-backup
```

### 2. Salin manual

```bash
cp "docs/design-backup/2026-08-09-dashboard-page-asli.tsx" "src/app/(app)/dashboard/page.tsx"
rm -rf src/components/dashboard   # komponen baru yang tidak dipakai lagi
```
