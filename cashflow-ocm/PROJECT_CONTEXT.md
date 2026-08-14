# Konteks Proyek CV OCM

Dokumen ini adalah peta teknis dan keputusan bisnis yang harus dibaca sebelum
mengubah perhitungan keuangan atau melakukan deployment.

## Produksi dan sumber kode

- Aplikasi produksi: `https://omandacerli.com`
- Proyek Vercel: `nurulichzasp-s-projects3/cashflow-ocm-d61i`
- Repository resmi: `https://github.com/nurulichzasp/cashflow-ocm`
- Branch produksi: `main`
- Root aplikasi di repository/Vercel: `cashflow-ocm`
- Database produksi: Turso/libSQL, diakses melalui Drizzle ORM.
- Foto bukti: Vercel Blob.
- Autentikasi: Better Auth, role `owner` dan `admin`.

Jangan melakukan deployment produksi dari salinan lokal yang tidak terhubung ke
Git tanpa terlebih dahulu menyelaraskannya dengan `main`. Deployment langsung
dari salinan yang tertinggal dapat mengembalikan perubahan yang sudah ada di
produksi. Alur yang dianjurkan: sinkronkan Git → tes/build → preview → verifikasi
→ production.

## Modul utama

- `app/(dashboard)/pembelian`: pembelian dari peron dan snapshot margin transaksi.
- `app/(dashboard)/penjualan`: penjualan ke BGA.
- `app/(dashboard)/harga`: riwayat harga acuan per produk dan tanggal berlaku.
- `app/(dashboard)/peron`: data peron, DP/modal, portal, retensi, dan kesehatan.
- `app/(dashboard)/kas`: mutasi akun kas.
- `app/(dashboard)/biaya`: biaya operasional.
- `app/(dashboard)/laporan`: laporan transaksi dan laba rugi.
- `lib/harga.ts`: sumber tunggal aturan harga, selisih, kelebihan, dan margin.
- `lib/db/schema.ts`: skema database.

## Aturan keuangan yang harus dijaga

- Uang disimpan sebagai integer Rupiah; tonase dapat berupa bilangan pecahan.
- Selisih jual BGA adalah Rp120/kg kecuali ada keputusan bisnis baru yang eksplisit.
- Harga beli peron = harga acuan produk + kelebihan peron.
- Harga jual dan laba transaksi dihitung kembali di server; perhitungan klien hanya
  untuk pratinjau.
- Tarif/margin disimpan sebagai snapshot pada pembelian agar riwayat tidak berubah
  ketika tarif peron berubah.
- Transaksi berstatus lunas wajib memiliki sumber kas.
- Operasi keuangan majemuk harus tetap berada dalam transaksi database.

## Keputusan tarif 15 Agustus 2026

Aturan ini berdasarkan **tanggal transaksi**, bukan tanggal saat data dimasukkan.
Transaksi sampai 14 Agustus 2026 tetap memakai aturan sebelumnya.

- Kelebihan Rp90/kg: Husein, Wiranto, Jono, Neko, Roni.
- Kelebihan Rp70/kg: Budi, Ciput, Iwan, Nolin, Pribadi, Umum.
- Ibnu tetap memakai tarif yang tersimpan pada data peron.
- Peron lain yang tidak disebut tetap memakai tarif tersimpan.
- BRDL tetap memakai harga acuan BRDL masing-masing (KTWM/TRYM/LMDM).
- Mulai tanggal tersebut, hanya **kelebihan** BRDL yang disamakan dengan TBS;
  batas lama Rp50/kg tidak diterapkan pada transaksi baru.

Implementasi aturan bertanggal berada di `lib/harga.ts`. Semua perubahan tarif
berikutnya harus ditambahkan sebagai aturan bertanggal dan dilengkapi tes batas
tanggal agar transaksi historis tidak ikut berubah.

## Status mitra dan dana nonoperasional

- Sikun dan Hanapi sudah berhenti sebagai peron; keduanya dipertahankan sebagai
  data nonaktif agar histori tidak hilang.
- Hanapi masih memiliki saldo modal historis Rp140.000.000 yang tetap harus terlihat.
- Sany C bukan peron operasional. Catatan tersebut mewakili pinjaman dana OCM untuk
  pembelian alat dan memiliki saldo Rp250.000.000. Untuk sementara data disimpan
  sebagai entitas nonaktif agar saldo dan histori tidak berubah.
- Peron nonaktif tidak boleh muncul dalam pilihan transaksi pembelian baru, tetapi
  tetap muncul pada daftar peron, detail modal, dan perhitungan total dana beredar.

## Pemeriksaan sebelum deployment

1. Pastikan perubahan dibandingkan dengan repository `main` terbaru.
2. Jalankan `npm test`.
3. Jalankan `npx tsc --noEmit`.
4. Jalankan `npm run build`.
5. Buat preview deployment dan periksa halaman login serta `/api/health`.
6. Baru promosikan/deploy ke production dan periksa `omandacerli.com`.

Saat dokumen ini dibuat, build produksi dan 105 tes lulus. Lint seluruh proyek
masih memiliki utang teknis lama; kegagalan lint harus dibedakan antara masalah
lama dan regresi dari perubahan baru.
