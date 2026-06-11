# Cashflow CV OCM

Aplikasi manajemen cashflow untuk **CV Omanda Cerli Mandiri (OCM)** — supplier TBS & BRDL ke PKS PT. BGA. Mencatat pembelian dari peron, penjualan ke BGA, buku kas, biaya operasional, dan laporan laba rugi.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** + shadcn/ui (Radix + base-ui)
- **Drizzle ORM** + **libSQL/Turso** (SQLite)
- **Better Auth** (sesi email/password, 2 role: `admin` & `owner`)
- **Vercel Blob** (foto bukti), **recharts**, **xlsx**, **Sonner**
- Deploy: **Vercel** → [omandacerli.com](https://omandacerli.com)

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local   # isi kredensial (lihat di bawah)
npm run dev                  # http://localhost:3000
```

## Build

```bash
npm run build                # next build (Turbopack)
```

> **Catatan iCloud:** folder ini ada di `Documents` (iCloud), yang kadang membuat
> file duplikat `* 2.*` di `.next/`. Bila build/`tsc` lokal gagal karena itu,
> jalankan `find .next -name "* 2.*" -delete` lalu build ulang. Vercel build dari
> checkout bersih, jadi aman di produksi.

## Variabel environment

Wajib (lihat `.env.example` untuk daftar lengkap):

| Var | Fungsi |
|---|---|
| `TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN` | Database Turso |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Sesi auth |
| `NEXT_PUBLIC_APP_URL`, `ADDITIONAL_TRUSTED_ORIGINS` | Origin tepercaya auth |
| `BLOB_READ_WRITE_TOKEN` | Upload foto (Vercel Blob) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` | Notifikasi Telegram |
| `CRON_SECRET`, `BACKUP_TOKEN` | Cron ringkasan harian & backup |

> Produksi memakai env vars di dashboard Vercel — perubahan `.env.local` **tidak**
> menyentuh produksi.

## Domain & aturan kunci

- **Uang disimpan sebagai integer Rupiah**; berat (tonase/qtyKg) sebagai `real`.
- **Harga Beli = Harga Jual BGA − keuntungan/kg peron** (margin 40–100 Rp/kg).
- Pembayaran BGA: Senin/Rabu/Jumat; spread BGA tetap 120 Rp/kg.
- `proxy.ts` (bukan `middleware.ts` di Next 16) menggerbang route non-publik → `/login`.
- Semua halaman `export const dynamic = 'force-dynamic'` (data keuangan harus fresh).

## Skrip npm

| Skrip | Fungsi |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Build produksi |
| `npm run lint` | ESLint |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle Kit |

## Struktur

```
app/
  (auth)/login           Halaman login
  (dashboard)/           Modul: dashboard, peron, harga, pembelian, penjualan,
                         kas, biaya, laporan, pengaturan
  api/                   Auth, foto, metrics, cron, telegram, backup, health
components/              UI bersama (shadcn + komponen app)
lib/                     db, auth, format, permissions, audit, utils
drizzle/                 Migrasi SQL
```

---
Internal — CV Omanda Cerli Mandiri.
