# Dokumentasi Perubahan Tema 17 Agustus 2026 (Merdeka Theme) & Panduan Revert

Dokumen ini mencatat seluruh file, komponen, dan perubahan kode yang dilakukan selama perayaan **HUT Republik Indonesia 17 Agustus 2026** di aplikasi **TrackingDuit / TrakingDuit**.

Dokumen ini juga dilengkapi dengan **Petunjuk & Script Revert Otomatis** agar setelah tanggal **20 Agustus 2026**, Mandor / AI Agent dapat mengembalikan aplikasi ke tema normal (Biru `#0060af`) secara cepat dan presisi tanpa mencari 1-per-1.

---

## 1. Ringkasan Perubahan Berdasarkan Komponen & File

### A. Global CSS Brand Colors (`src/app/globals.css`)
- **Tujuan**: Mengubah warna identitas utama aplikasi dari Biru (`#0060af`) ke Merah Merdeka (`#dc2626`).
- **Lokasi Baris & Perubahan**:
  - `Line 13`: `--brand: #dc2626;` *(Normal: `#0060af`)*
  - `Line 15`: `--brand-grad: linear-gradient(135deg, #991b1b, #dc2626, #b91c1c);` *(Normal: `linear-gradient(135deg, #003d7a, #0072c6)`)*
  - `Line 36`: `--brand: #ef4444;` *(Normal Dark Mode: `#3b9bff`)*
  - `Line 37`: `--brand-fg: #ffffff;` *(Normal Dark Mode: `#04121f`)*
  - `Line 38`: `--brand-grad: linear-gradient(135deg, #7f1d1d, #b91c1c, #dc2626);` *(Normal Dark Mode: `linear-gradient(135deg, #0b3a6d, #0f6bb8)`)*

---

### B. Modal Promo Merdeka (`src/components/promo/promo-merdeka-modal.tsx`)
- **Tujuan**: Modal popup otomatis yang menawarkan promo **PROMOMEREDEKA** (Gratis 7 Hari Pro & Diskon Rp 20.000/bulan).
- **Status**: Berkas baru (*untracked file*).
- **Trigger**: Ditampilkan 1x di bulan Agustus via `localStorage` key `merdeka_promo_seen_2026`.
- **Integrasi**: Dipasang di `src/components/layout/app-shell.tsx` baris 29 & 172.

---

### C. Ornamen Merah Putih (`src/components/ui/indonesia-decorations.tsx` & `src/components/layout/app-shell.tsx`)
1. `src/components/ui/indonesia-decorations.tsx`:
   - **Status**: Berkas baru (*untracked file*).
   - **Komponen SVG/UI**: `BuntingFlagsSVG` (rumbai gantung), `RedWhiteRibbonSVG` (pita), `WavingFlagSVG` (bendera berkibar), `MerdekaBadge` (badge emas berkilau).
2. `src/components/layout/app-shell.tsx`:
   - `Line 28`: Import `RedWhiteRibbonSVG`, `WavingFlagSVG`, `BuntingFlagsSVG`.
   - `Line 29`: Import `PromoMerdekaModal`.
   - `Line 172`: Render `<PromoMerdekaModal />`.
   - `Line 178`: `BrandMark` menggunakan gradien merah & emoji `🇮🇩`.
   - `Line 265-269`: TopBar header menggunakan border Merah-Putih & bunting flags SVG.
   - `Line 308-315`: TopBar header menampilkan badge `HUT RI 🇮🇩`.

---

### D. Pricing & Promo Code (`src/lib/subscription.ts` & `src/app/(app)/premium/page.tsx`)
1. `src/lib/subscription.ts`:
   - `Line 15-16`: Penambahan tipe `originalPrice?: number;` dan `promoBadge?: string;` di `TierConfig`.
   - `Line 63-66`: Harga paket `pro` diubah menjadi `20_000` dengan `originalPrice: 45_000` dan `promoBadge: "PROMO MERDEKA"`.
2. `src/app/(app)/premium/page.tsx`:
   - `Line 19`: Import ornamen dari `@/components/ui/indonesia-decorations`.
   - `Line 74-130`: Banner Highlight **PROMO MERDEKA** (Kode `PROMOMEREDEKA`).
   - `Line 185, 267`: Passing `originalPrice` & `promoBadge` ke `PricingCard`.
   - `Line 310-340`: Tampilan harga coret (original price) & badge promo.

---

### E. Login Page Background & Accent (`src/app/login/page.tsx`)
- **Tujuan**: Halaman login bertema Merah-Putih dengan banner festive, rumbai bendera, & tombol aksen merah.
- **Lokasi & Perubahan**:
  - `Line 20`: Import `BuntingFlagsSVG`, `WavingFlagSVG`, `MerdekaBadge`, `RedWhiteRibbonSVG`.
  - `Line 70-135`: Banner festive Merdeka di atas form login dengan badge `HUT RI 79 / KEMERDEKAAN`.
  - `Line 160-195`: Tombol login menggunakan gradien merah (`from-red-600 via-rose-600 to-red-700`) & teks `"Masuk ke TrakingDuit 🇮🇩"`.

---

### F. Rebranding & UI Text ("TrakingDuit" / "TrackingDuit")
- **Tujuan**: Konsistensi penamaan brand di header dan shell selama event.
- **File terkait**: `src/components/layout/app-shell.tsx` (`Line 126`, `Line 262`), `src/app/login/page.tsx` (`Line 185`).

---

## 2. Petunjuk & Script Revert (Setelah 20 Agustus 2026)

Setelah perayaan kemerdekaan usai (pasca 20 Agustus 2026), lakukan revert tema kembali ke warna standar Biru `#0060af`.

### OPSI 1: Revert Otomatis via Command Git (Sangat Direkomendasikan)
Jika perubahan belum dikomit atau jika ingin melakukan revert perubahan tema secara cepat:

```bash
# 1. Restore file ke versi normal
git checkout origin/main -- src/app/globals.css src/components/layout/app-shell.tsx src/lib/subscription.ts src/app/\(app\)/premium/page.tsx src/app/login/page.tsx

# 2. Hapus file komponen dekorasi promo (opsional jika tidak lagi dipakai)
rm -f src/components/promo/promo-merdeka-modal.tsx src/components/ui/indonesia-decorations.tsx

# 3. Jalankan typecheck untuk memastikan 0 error
npx tsc --noEmit
```

---

### OPSI 2: Manual Revert Checklist (Jika Ingin Mengubah Kode Langsung)

1. **`src/app/globals.css`**:
   - Kembalikan `--brand` ke `#0060af`.
   - Kembalikan `--brand-grad` ke `linear-gradient(135deg, #003d7a, #0072c6)`.
   - Kembalikan Dark mode `--brand` ke `#3b9bff` dan `--brand-fg` ke `#04121f`.

2. **`src/components/layout/app-shell.tsx`**:
   - Hapus import & komponen `<PromoMerdekaModal />`.
   - Hapus import & komponen `BuntingFlagsSVG`, `WavingFlagSVG`, `RedWhiteRibbonSVG`.
   - Kembalikan styling header `TopBar` dan `BrandMark` ke warna `bg-brand` standar.

3. **`src/lib/subscription.ts`**:
   - Kembalikan harga paket `pro` ke `45_000`.
   - Hapus `originalPrice` dan `promoBadge` dari objek `pro`.

4. **`src/app/(app)/premium/page.tsx`**:
   - Hapus banner `Banner Highlight Promo Merdeka`.
   - Hapus komponen ornamen Indonesia.

5. **`src/app/login/page.tsx`**:
   - Hapus banner Merdeka & kembalikan tombol ke `bg-[linear-gradient(135deg,#003d7a,#0060af)]`.

6. **Verifikasi**:
   - Jalankan `npx tsc --noEmit` untuk mengonfirmasi bahwa seluruh tipe dan syntax sudah valid.
