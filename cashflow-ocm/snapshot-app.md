# Snapshot Aplikasi — Cashflow OCM (keadaan faktual kode)

> Potret **apa yang benar-benar ada di kode** per tanggal di bawah. Dipakai sebagai sumber kebenaran saat konsultasi spec. Bila berbeda dengan dokumen lain, **utamakan file ini**.

---

## 1. Stack & Versi

| Komponen | Versi (package.json) |
|---|---|
| Next.js | 16.2.9 (App Router) |
| React / React DOM | 19.2.7 |
| TypeScript | 5.x (strict, `ignoreBuildErrors: false`) |
| Tailwind CSS | v4 |
| Drizzle ORM | 0.45.2 |
| Better Auth | **1.6.16** (bukan 1.6.7 lagi) |
| libSQL / Turso client | 0.17.3 |
| motion (Framer Motion) | 12.40 |
| recharts | 3.8 |
| zod | 4.4 · react-hook-form 7.78 · sonner 2.0 |

**Build & deploy:**
- Build command = **`next build` (Turbopack, default Next 16)**. ⚠️ Koreksi: app **TIDAK** lagi pakai `--webpack`; build mulus di Turbopack (sempat dicoba lock webpack lalu di-revert).
- Deploy: Vercel. Domain produksi **`omandacerli.com`** (+ alias `cashflow-ocm-d61i.vercel.app`). Dua project Vercel; alur andal = `git push main` lalu `vercel --prod --yes`.
- Env penting: `BETTER_AUTH_URL` (URL produksi), `BETTER_AUTH_SECRET`, `ADDITIONAL_TRUSTED_ORIGINS` (daftar origin tepercaya, koma), `TURSO_CONNECTION_URL/AUTH_TOKEN`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `BACKUP_TOKEN`, `TELEGRAM_BOT_TOKEN/CHAT_ID/WEBHOOK_SECRET`. Opsional: `NEXT_PUBLIC_OCM_WHATSAPP` (nomor WA → tombol chat di portal peron).
- **Gerbang auth = `proxy.ts`** (Next 16 mengganti `middleware.ts`). Redirect path non-publik tanpa cookie sesi → `/login`. publicPaths antara lain: `/login`, `/api/auth`, `/api/cron`, `/api/peron-health`, `/api/backup`, `/api/telegram`, `/manifest.webmanifest`, `/sw.js`, `/offline`, `/` (welcome), `/p/` (portal peron).

---

## 2. Skema Database (Drizzle / libSQL — SQLite)

**Konvensi tipe (PENTING):**
- **Uang = `integer` rupiah penuh** (tanpa desimal).
- ⚠️ **Berat kg = `real`, BUKAN integer** (`tonase`, `qtyKg`, `total_kg` — berat bisa pecahan). Koreksi terhadap anggapan "uang & kg integer".
- **Tanggal transaksi = `text` "YYYY-MM-DD"** (sudah WIB saat input). **Timestamp sistem** (`created_at` dll) = `integer` unixepoch.
- **PK domain = `text` hex acak** (`lower(hex(randomblob(8)))`), kecuali tabel Better Auth (`text` id) dan `peron_snapshot`/`peron_followup` (`integer` autoincrement).

### Better Auth (4 tabel)
- `user` (id text PK, name, email unik, **role** text default `viewer`, **permissions** text/JSON, nickname/fullName/phone/address, dst).
- `session`, `account`, `verification` — standar Better Auth.

### Domain inti
- **`peron`** — id, kode (int, opsional), nama, kontak, alamat, status `aktif|nonaktif`, **keuntunganPerKg** (int, default 50), createdAt. *Peron = pelanggan OCM.*
- **`modal_peron`** — DP/modal ke peron. peronId→peron, tanggal (text), jenis `tambah|kurang|kembali`, jumlah (int Rp), createdBy, idempotencyKey.
- **`harga_acuan`** — tanggalBerlaku, produk `TBS|BRDL KTWM|BRDL TRYM|BRDL LMDM`, **hargaLapangan** (int), **selisihJualBga** (int, default 120).
- **`pembelian`** (header tiket beli dari peron) — tanggal (text), kategori `OCM R1|OCM R2|OCMP SAGU|OCM BRDL|OCM BRDL KTWM|OCM BRDL TRYM|OCM BRDL LMDM`, **peronId**→peron, **tonase (real kg)**, hargaJual/hargaBeli (int), totalJual/totalBeli/keuntungan (int Rp), **statusBayarPeron `belum|lunas`**, **tanggalBayar** (text|null), **sumberBayarId**→akun_kas, createdBy, idempotencyKey. Field legacy noTid/nopol/supir nullable.
- **`pembelian_detail`** — line item per TID: pembelianId→pembelian, tonase (real), hargaLapangan, subtotalBeli/Jual, keuntungan, tanggalReplas.
- **`penjualan`** (ke BGA) — tanggal, noBast, noInvoice, statusBayar `belum|lunas`, tanggalBayarBga, **totalBersih/totalNilai** (int, nullable), createdBy, idempotencyKey.
- **`penjualan_detail`** — produk `TBS|BRDL`, **qtyKg (real)**, hargaJual, subtotal.
- **`biaya_operasional`** — tanggal, kategori `gaji|solar|transport|lainnya`, jumlah (int), akunSumberId→akun_kas, createdBy, idempotencyKey.
- **`akun_kas`** — nama, tipe `bank|tunai`, **saldoAwal** (int), urutan.
- **`transaksi_kas`** — buku kas. tanggal, akunId→akun_kas, **arah `masuk|keluar`**, jumlah (int), kategori `penerimaan_bga|tarik_bri|bayar_peron|modal_peron|kembali_modal|biaya_operasional|penyesuaian|lainnya`, refTabel/refId (tautan ke entitas sumber), transferGrup, createdBy, idempotencyKey.
- **`pembelian_foto`**, **`biaya_foto`** — url foto bukti (Vercel Blob).
- **`ppn_bulanan`** (bulan YYYY-MM, totalPpn, statusSetor) & **`pph_bulanan`** (bulan, nominal default 698917, statusBayar) — pajak.
- **`activity_log`** — audit: userId, action, entityType, entityId, description, oldValues/newValues (JSON), ip/userAgent.

### Modul Peron baru (Kesehatan & Portal)
- **`peron_snapshot`** — snapshot mingguan: peronId, weekStart (ISO Senin), **totalKg (real)**, setorCount, **share (real 0..1)**, isOperationalWeek (bool). Unik per (peron, minggu).
- **`peron_health`** — status terkini per peron (1 baris): status `normal|perhatian|kritis|data_kurang`, shareCurrent/shareBase/shareDelta, declineWeeks, typicalGap, daysSinceLast, lastSetorDate, **seasonVerdict `musim|lari`**, isArchived (bool).
- **`peron_followup`** — log tindak lanjut: triggeredStatus, contacted (bool), reason `harga_kalah|pindah_cv|masalah_operasional|memang_musim|lainnya`, note, outcome `kembali_normal|masih_pantau|hilang`, createdBy.
- **`peron_access`** — token portal publik: peronId PK, **token** (64-hex unik), isActive (bool), issuedAt, lastViewedAt.

### ⚠️ Jawaban pertanyaan kunci
- **Pencatatan PEMBAYARAN ke peron per peron_id:** **belum ada tabel ledger pembayaran terpisah** (jumlah/metode/cicilan). Pembayaran dilacak **per-tiket** lewat `pembelian.statusBayarPeron` (`belum`/`lunas`) + `pembelian.tanggalBayar` + `pembelian.sumberBayarId`. → **"Sisa belum dibayar" per peron = Σ `pembelian.totalBeli` yang `statusBayarPeron='belum'`.** (Portal peron sudah hitung begini.)
- **Tonase per peron tersimpan di:** tabel **`pembelian`** (kolom `peron_id`, `tanggal`, `tonase` real-kg, `harga_beli`, `kategori`, `total_beli`). Rincian per TID di `pembelian_detail`.

---

## 3. Modul & Route (App Router)

**Halaman (login wajib kecuali ditandai publik):**
- `/` — **Welcome screen** (publik; sudah login → redirect `/dashboard`). `app/loading.tsx` = splash branded saat cek sesi.
- `/login` — form login (publik).
- `/dashboard` — ringkasan: Total Modal Berputar + sparkline, kartu Pembelian/Penjualan/Biaya, **"Margin Dagang"** (dulu "Net Margin"/"Estimasi Laba" — = Σ markup peron, sebelum biaya operasional), harga lapangan, saldo rekening & kas.
- `/pembelian`, `/penjualan`, `/kas`, `/biaya`, `/harga` — daftar + form (dialog/sheet) + filter.
- `/peron` (+ `/peron/[id]` detail dengan kartu **Link Portal**).
- `/peron/kesehatan` (Layar A: ringkasan + "Perlu Ditindaklanjuti" 🔴🟡 + collapsible) + `/peron/kesehatan/[id]` (Layar B: grafik share% + bar kg + verdict musim/lari + riwayat + form tindak lanjut + arsip).
- `/laporan` — laba rugi (akrual), per peron, buku kas, pajak, neraca, tahunan.
- `/pengaturan` (+ sub: perusahaan, pengguna, pajak, printer, tampilan, cadangan, harga, notifikasi, tentang).
- **`/p/[token]`** — **Portal Peron PUBLIK, read-only** (di luar login & shell app). Tema terang. Tampil: Sisa Belum Dibayar, ringkasan periode, harga acuan, riwayat setoran & pembayaran — **hanya milik peron itu**. Token invalid → 404 ramah.
- `/offline` — fallback PWA.

**API routes:** `/api/auth/[...all]`, `/api/foto` & `/api/upload-foto` (Blob), `/api/metrics` (gate `canViewFinance`), `/api/cron/daily-summary` (Telegram + **rebuild kesehatan peron** sekalian), `/api/peron-health/refresh` (manual/tombol), `/api/backup`, `/api/telegram/webhook`, `/api/parse-bast`, `/api/health`, `/api/notify`.

**Server actions** (per modul `actions.ts`): pembelian, penjualan, kas, biaya, harga, peron, laporan, pengaturan. Plus `peron/health-actions.ts` (list/detail/refresh/createFollowup/archivePeron) & `peron/portal-actions.ts` (generate/revoke/getPeronAccess token portal). Semua mutasi tulis `activity_log`; create uang pakai idempotency-key (anti-dobel).

---

## 4. Struktur File (relevan)

```
app/
  (auth)/login
  (dashboard)/{dashboard,pembelian,penjualan,kas,biaya,harga,laporan,
              peron,peron/[id],peron/kesehatan,peron/kesehatan/[id],pengaturan/*}
  p/[token]            ← portal publik
  api/*                ← auth, foto, cron, peron-health, backup, telegram, dll
  page.tsx (welcome) · loading.tsx (splash) · error.tsx · global-error.tsx · layout.tsx
components/            ← UI bersama: ui/* (shadcn/base-ui), bottom-nav, sidebar,
                         scroll-shell, mobile-header, fab, command-palette,
                         welcome-screen, splash-screen, skeletons, empty-state, dll
lib/
  db/{index,schema}.ts · auth.ts · format.ts · permissions.ts · audit.ts · nav-routes.ts
  peron-health/{config,week,rebuild,status-meta}.ts   ← otak kesehatan peron
  peron-portal/data.ts                                ← data portal (server-only)
proxy.ts              ← gerbang auth (pengganti middleware)
scripts/              ← migrasi additif SQL langsung (add-*-table.ts)
```

---

## 5. Konvensi & Pola

- **Uang = integer Rp; kg = real; tanggal text "YYYY-MM-DD" WIB.** Format tampilan: `formatRupiah` (presisi), `formatCompact` (Rp 5,83 M / 296,8 jt / 45 rb — untuk angka glance), `formatTanggal` (10 Jun 2026), `formatTanggalLengkap` (Rabu, 10 Juni 2026). Angka pakai `tabular-nums` (kelas `.num`).
- **Warna: sistem netral monokrom (charcoal/stone) + SATU aksen emerald** (`--brand` #0E7A58 light / #34A77F dark; `--brand-solid` #0E7A58). Emerald hanya untuk CTA/elemen aktif/positif. **Oranye sudah dihapus.** Merah & amber dipakai hemat (destruktif/peringatan) via hex eksplisit (catch-all globals menetralkan kelas warna mentah). Dark mode default mengikuti sistem.
- **UI:** shadcn/ui + base-ui + Radix. Dialog form di mobile = sheet bawah; overlay glass (`.glass-panel`). Mobile-first iPhone 15 Pro/Safari: `viewport-fit=cover`, `env(safe-area-inset-*)`, `100dvh`. PWA installable (manifest + service worker, level "tahan sinyal jelek", bukan offline-input).
- **Bottom nav — pill "liquid glass" gaya Instagram, IKON-ONLY (tanpa label):** 5 tab **Beranda(grid/LayoutDashboard) · Pembelian(cart) · Cari(search, tengah) · Penjualan(trending/TrendingUp) · Lainnya(menu)**. (Ikon Beranda & Penjualan di-REVERT iterasi-3 dari House/Banknote — gaya bar TIDAK berubah.) Material kaca sangat transparan (`bg-white/[0.07]` + `backdrop-blur-2xl` + highlight tepi atas inset) → konten samar tembus. **Indikator aktif = pill oval putih translucent** (`white/12-14`, geser antar tab via `layoutId`, tanpa border) + ikon emerald. Scroll bawah → bar **menyusut halus spring** (scale 0.9), atas/puncak → penuh. Slot badge titik notif siap (`dot` di NavTab, belum diwire). **Disembunyikan di /profil & /pengaturan/\*** (full-screen, `isFullscreenRoute` di `mobile-header.tsx`). Drawer "Lainnya" = halaman kerja saja (Buku Kas/Biaya/Laporan/Peron/Kesehatan Peron/Harga) — TANPA Pengaturan/akun/logout (itu pindah ke Profil). Header: **logo OCM kiri = tombol Beranda (→/dashboard)**; avatar kanan → /profil; di route full-screen logo diganti **tombol back lingkaran glass** (judul tengah). Desktop pakai sidebar kiri (`components/sidebar.tsx` — **terpisah dari `lib/nav-routes.ts` mobile**; tambah menu wajib di KEDUANYA).
- **Profil & Pengaturan = halaman FULL-SCREEN** (`/profil` + `/pengaturan/*`): tanpa bottom nav, header tombol back glass + judul tengah. List gaya Settings Instagram: **datar (tanpa kartu/kotak ikon), ikon tipis + label + chevron, hairline separator**. `/profil` = kartu profil ramping + Informasi pribadi + semua menu Pengaturan (link ke `/pengaturan/*`) + Keluar merah. Grup menu di `lib/settings-groups.ts` (dipakai bersama /profil & /pengaturan).
- **Nota cetak pembelian (`app/(dashboard)/pembelian/invoice-print.tsx`) — menu 3 mode** (`PrintNotaButton`, dropdown ikon printer): **"Print Lengkap (A5)"** (window.open → `@page A5`, `window.print()`), **"Print Thermal (preview)"** (window.open → `@page` 58/80mm dari `localStorage thermal_paper_width` di `pengaturan/printer`), **"Thermer (langsung)"** (`window.location.href = thermer://?data=<JSON dict typed entries {type,content,bold,align,format}>` — app **Thermer/Mate Technologies** iOS, printer BT user tersambung ke app itu; format JSON = skema print-data Mate; fallback toast "Pastikan aplikasi Thermer terpasang" via deteksi `visibilitychange`). Mode terakhir diingat (`localStorage last_print_mode`, ditandai titik emerald). Tiap nota ada tombol **"← Tutup"** (`window.close()`) + `print:hidden`. **Keterangan "Total N Replas (rentang)"** tampil di KETIGA mode di atas footer — SATU SUMBER helper `buildKeteranganReplas(details, tanggal)` di `lib/format.ts` (dipakai juga oleh form pembelian live; nota pakai `p.keterangan` tersimpan dulu, fallback helper). Rekap = tabel multi-tiket terpisah (tanpa keterangan per-tiket).
- **Animasi transisi antar-halaman: BELUM ADA** (tidak ada slide/View Transition antar route). Yang ada: `SwipeNavigator` (gesture dari tepi layar → `router.back()`/`forward()`, sudah disesuaikan arah iOS: geser kanan dari tepi kiri = back), animasi drawer/sheet (motion), count-up angka dashboard, sparkline draw-in, skeleton shimmer. `prefers-reduced-motion` dihormati.
- **Kesehatan peron berbasis SHARE, bukan kg** (kontribusi relatif peron ke total volume) → kebal musim trek. Rebuild jalan harian (digabung cron daily-summary) + tombol manual. Status: data_kurang (riwayat < 4 minggu operasional) → kritis → perhatian → normal.

---

## 6. Catatan / Gotcha

- **Migrasi DB: JANGAN `drizzle-kit push/migrate`** (meta snapshot drift). Pola dipakai = **SQL additif langsung** lewat `scripts/add-*.ts` (`CREATE TABLE/COLUMN IF NOT EXISTS`, idempoten) terhadap Turso prod. `.env.local` menunjuk DB **produksi** (tidak ada DB dev terpisah).
- **`proxy.ts` publicPaths pakai `startsWith`** → entri harus presisi. `/` exact-match (jangan masuk array startsWith — akan buka semua). `/p/` WAJIB trailing slash (kalau `/p` saja → cocok `/peron`, `/penjualan`, `/pengaturan`, `/pembelian`). Route cron/portal baru WAJIB ditambah ke publicPaths walau self-guard secret.
- **Dua sumber navigasi** (mobile `lib/nav-routes.ts` vs desktop `components/sidebar.tsx`) — tambah menu di keduanya.
- **iCloud:** folder ada di `Documents` iCloud → kadang muncul file duplikat `* 2.*` di `.next/` yang menggagalkan `tsc`/build lokal. Jalankan `find .next -name "* 2.*" -delete` sebelum build. Vercel (checkout bersih) aman.
- **"Margin Dagang" di dashboard/laporan = Σ markup peron (Rp/kg × tonase), bukan laba bersih** (belum dikurangi biaya operasional/pajak). Sudah dilabeli jujur.
- **Utang teknis diketahui (bukan blocker):** lint ~120 problem (mayoritas `no-explicit-any` + `<img>` bukan next/image) — `next build` tidak gate lint; Neraca bisa tak balance presisi (kas bruto vs piutang/laba neto); PPN aktual dari rekap BGA belum disimpan ke kolom (di-estimasi). Ledger pembayaran peron granular belum ada (pakai status tiket).
- **Peron health saat ini mayoritas `data_kurang`** karena riwayat app baru ~2 minggu (< ambang 4 minggu operasional) — wajar, status 🔴🟡 muncul otomatis seiring data menumpuk.

---

*Snapshot dibuat: 11 Juni 2026.*
