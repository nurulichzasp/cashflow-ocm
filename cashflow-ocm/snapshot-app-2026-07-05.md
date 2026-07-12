# Snapshot Teknis — Cashflow OCM (fresh)

> **HEAD:** `e380ab8` — *fix(kas): batasi kategori entri manual* (2026-07-05, tip Batch 1)
> **Branch:** `main` = `origin/main` (0 ahead / 0 behind)
> **Working tree:** bersih (hanya file dokumen audit ini + `temuan-audit-2026-07-05.md` yang untracked).
> **Deploy:** produksi `omandacerli.com` LIVE (HTTP 200). Deploy `dpl_EHjMNuEJxP8…` **READY** (target production, commit `e380ab8`) — dikonfirmasi via Vercel API. Push `main` = auto-deploy Vercel `d61i`.
> **Tanggal:** 2026-07-05 (mencakup **Batch 1 "Benar Dulu"** — 6 commit di atas `b8400e0`).
> **Verifikasi:** seluruh isi diverifikasi langsung dari source (schema.ts, package.json, permissions.ts, harga.ts, proxy.ts, actions.ts, dll), BUKAN dari README/komentar/ingatan.
> **Catatan file:** snapshot terkini @ `e380ab8`, menggantikan versi Jun 27 (`e73983c`). Diekspor ke `~/Desktop/Dokumen Project OCM/snapshot-app.md` untuk di-upload ke claude.ai Project knowledge.
>
> **Delta Batch 1 (`b8400e0` → `e380ab8`):** `4a41918` Laporan Pembelian Bulanan · `9262621` tarif pajak app_settings ter-wire · `8c3f981` WIB metrics · `652497b` audit-log createHargaAcuan · `4619fd4` satukan DEFAULT_PPH25_NOMINAL · `e380ab8` batasi kategori kas manual.

---

## 1. Stack & Versi (dari `package.json`)

| Area | Paket | Versi |
|---|---|---|
| Framework | `next` | ^16.2.9 (App Router; gate via **`proxy.ts`**, bukan `middleware.ts`) |
| UI runtime | `react` / `react-dom` | ^19.2.7 |
| ORM | `drizzle-orm` | ^0.45.2 (+ `drizzle-kit` ^0.31.10 dev) |
| DB driver | `@libsql/client` | ^0.17.3 (Turso/libSQL) |
| Auth | `better-auth` | ^1.6.16 |
| UI primitif | `@base-ui/react` ^1.5.0 **dan** `@radix-ui/react-dialog` ^1.1.16 + `@radix-ui/react-select` ^2.3.0 | dua library berdampingan |
| Styling | `tailwindcss` v4 + `tw-animate-css` + `class-variance-authority` + `tailwind-merge` | |
| Chart | `recharts` ^3.8.1 | |
| Animasi | `motion` ^12.40.0 | |
| Form | `react-hook-form` ^7.78 + `@hookform/resolvers` + `zod` ^4.4.3 | |
| Blob/foto+backup | `@vercel/blob` ^2.4.0 | |
| Spreadsheet | `xlsx` (SheetJS CDN tarball 0.20.3) | |
| Toast | `sonner` · Ikon `lucide-react` ^1.17 · Tema `next-themes` | |
| Test | `vitest` ^4.1.9 | 6 file test (harga, format, pajak, saldo, retensi, peron-health-week) |

**Build (`next.config.ts`):** `typescript.ignoreBuildErrors: **false**` (tipe error MENGGAGALKAN build — sengaja untuk app keuangan). `turbopack: {}` aktif. `serverExternalPackages`: better-auth (+core/adapters), @libsql/client, drizzle-orm, xlsx.

**Cron (`vercel.json`):** 2 cron ke `/api/cron/daily-summary` — `?mode=morning` (`0 0 * * *` = 07:00 WIB) & `?mode=evening` (`0 11 * * *` = 18:00 WIB). Backup harian + peron-health rebuild dibonceng ke cron sore (Hobby plan batasi jumlah cron).

**Build migrasi (`vercel-build`):** menjalankan 5 skrip additif berurutan lalu `next build`: `add-replas-fields`, `add-app-settings-table`, `add-biaya-kategori-lain`, `add-pembelian-keuntungan-snapshot`, `add-peron-ancaman-table`.

**Env penting (`.env.example`):** `TURSO_CONNECTION_URL`/`TURSO_AUTH_TOKEN`, `BETTER_AUTH_SECRET` (min 32 char, fail-closed di prod), `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `BACKUP_TOKEN`, `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_IDS`(multi)/`TELEGRAM_CHAT_ID`(fallback)/`TELEGRAM_WEBHOOK_SECRET`, `ADDITIONAL_TRUSTED_ORIGINS`, `NEXT_PUBLIC_OCM_WHATSAPP`.

---

## 2. Skema Database (dari `lib/db/schema.ts`)

**Jumlah tabel: 25** — **4 Better Auth** + **21 domain**.

**Better Auth (4):** `user` (kolom domain tambahan: `role` default `viewer`, `nickname`, `fullName`, `companyEmail`, `personalEmail`, `phone`, `address`, `permissions` JSON), `session`, `account`, `verification`.

**Domain — Master & transaksi (16):**
`akun_kas`, `peron`, `modal_peron`, `harga_acuan`, `pembelian` (+`pembelian_detail`), `penjualan` (+`penjualan_detail`), `biaya_operasional`, `pembelian_foto`, `biaya_foto`, `transaksi_kas`, `ppn_bulanan`, `pph_bulanan`, `app_settings`, `activity_log`.

**Domain — Kesehatan & Retensi peron (5):**
`peron_snapshot` (snapshot mingguan share), `peron_health` (1 baris/peron status), `peron_access` (token portal publik), `peron_followup` (log tindak lanjut), `peron_ancaman` (log ancaman/retensi kompetitor — **baru**, commit `b8400e0`).

**Konvensi nilai (konsisten & diverifikasi):**
- **Uang = `integer`** (rupiah bulat) — semua kolom nilai (`saldoAwal`, `jumlah`, `totalBeli`, `keuntungan`, `hargaLapangan`, dst). *DB live sudah integer (drizzle/0000 basi menulis `real` — FALSE ALARM audit lama, lihat `drizzle/README.md`).*
- **Berat = `real`** (`tonase`, `qtyKg`, `totalKg`, `share`, `volumeAcuan` — bisa pecahan).
- **Tanggal transaksi = `text` "YYYY-MM-DD" WIB** (`tanggal`, `tanggalBayar`, `weekStart`, dst).
- **Timestamp sistem = `integer` unixepoch** (`createdAt`/`updatedAt`, mode timestamp).

**Enum penting:** `akun_kas.tipe` [bank|tunai]; `peron.status` [aktif|nonaktif]; `harga_acuan.produk` [TBS|BRDL KTWM|BRDL TRYM|BRDL LMDM]; `pembelian.kategori` [OCM R1|R2|OCMP SAGU|OCM BRDL(+KTWM/TRYM/LMDM)]; `pembelian.statusBayarPeron` [belum|lunas]; `penjualan_detail.produk` [TBS|BRDL]; `biaya.kategori` [gaji|solar|transport|lainnya]; `transaksi_kas.kategori` (8) [penerimaan_bga|tarik_bri|bayar_peron|modal_peron|kembali_modal|biaya_operasional|penyesuaian|lainnya]; `transaksi_kas.arah` [masuk|keluar]; `peron_health.status` [normal|perhatian|kritis|data_kurang]; `peron_ancaman.tindakan` [dipantau|dipertahankan|dibiarkan].

**Relasi inti & `onDelete`:**
- FK `*.createdBy → user.id` (tanpa cascade) di modal/pembelian/penjualan/biaya/transaksi_kas.
- `onDelete: 'cascade'`: session/account→user; modal_peron/pembelian(detail)/penjualan(detail)/foto/peron_snapshot/peron_health/peron_access/peron_followup/peron_ancaman → parent-nya.
- `pembelian.peronId → peron.id` (TANPA cascade — sengaja, hapus peron di-guard di action).
- **Catatan:** Turso/libSQL FK-cascade tidak selalu aktif → child dihapus eksplisit di server action (kompensasi W9).

**Snapshot histori:** `pembelian.keuntunganPerKg` (nullable) membekukan tarif untung/kg peron saat transaksi → histori tiket TIDAK berubah saat `peron.keuntunganPerKg` diedit belakangan.

**Index idempotency (unique):** `modal_peron`, `pembelian`, `penjualan`, `biaya_operasional`, `transaksi_kas` masing-masing punya `*_idempotency_key_idx`. `peron_snapshot` unik `(peronId, weekStart)`; `peron_access.token` unik.

**Angka hardcoded di schema:** `pph_bulanan.nominal` default **698917** (juga di `lib/pajak.ts` `DEFAULT_PPH25_NOMINAL` & fallback `settings-client.tsx`). `harga_acuan.selisihJualBga` default **120**. `peron.keuntunganPerKg` default **50**.

---

## 3. Modul & Route

### 3a. Halaman (`app/`) — 26 `page.tsx`
- **Publik (tanpa sesi):** `/` (splash, EXACT-match), `/login`, `/p/[token]` (portal peron), `/offline`.
- **Ter-gate (butuh sesi):** grup `(dashboard)` — `/dashboard`, `/pembelian`, `/penjualan`, `/kas`, `/biaya`, `/laporan`, `/harga`, `/peron`, `/peron/[id]`, `/peron/kesehatan`, `/peron/kesehatan/[id]`, `/profil`, dan `/pengaturan` + 10 sub (`/pengaturan/{cadangan,harga,notifikasi,pajak,pengguna,perusahaan,printer,retensi,tampilan,tentang}`).
- **`/pengaturan`** = owner-only (guard di layout).

### 3b. Gate auth — `proxy.ts` (BUKAN `middleware.ts`)
Pencocokan **sadar-segmen** (bukan prefix string mentah). `publicPaths`: `/login`, `/api/auth`, `/api/cron`, `/api/peron-health`, `/api/backup`, `/api/telegram`, `/api/parse-bast`, `/api/client-error`, `/manifest.webmanifest`, `/sw.js`, `/offline`, `/p/` (trailing-slash wajib). `/` = EXACT. Proxy hanya cek **keberadaan cookie sesi** → redirect ke `/login?callbackUrl=`; validasi sesi + role sesungguhnya ada di tiap action/route.

### 3c. API Route (`app/api/`) — mekanisme auth diverifikasi dari kode

| Route | Method | Auth | Fungsi |
|---|---|---|---|
| `auth/[...all]` | GET/POST | better-auth handler (signup dimatikan) | login/session |
| `backup` | GET | sesi + **owner** | unduh backup DB |
| `backup` | POST | Bearer `BACKUP_TOKEN` (timing-safe) | backup → Blob |
| `client-error` | POST | **tanpa auth (sengaja)** | sink error klien, tak sentuh DB, payload dibatasi |
| `cron/daily-summary` | GET | Bearer `CRON_SECRET` **atau** `?secret=` (timing-safe) | ringkasan Telegram + backup + peron-health |
| `foto` | GET | sesi (host Blob divalidasi) | proxy gambar Blob |
| `health` | GET | sesi + **owner** | diagnostik (bocorkan skema/jumlah user/URL Turso ke owner) |
| `health` | POST | sesi + **owner** + frasa `HAPUS-SEMUA-DATA` | **RESET semua transaksi** |
| `metrics` | GET | sesi + `canViewFinance` | metrik keuangan dashboard |
| `notify` | POST | sesi + `canCreate` | kirim notif Telegram |
| `parse-bast` | POST | sesi | parse file BAST unggahan |
| `peron-health/refresh` | GET | Bearer `CRON_SECRET` **atau** `?secret=` (timing-safe) | rebuild kesehatan peron |
| `telegram/webhook` | POST | secret (header/`?secret=`, timing-safe) + whitelist chat | command bot |
| `telegram/webhook` | GET | `?secret=` (timing-safe) | setup webhook |
| `upload-foto` | POST | sesi | unggah gambar → Blob |

Semua secret **fail-closed** (env kosong → 401; `BETTER_AUTH_SECRET` kosong → throw saat boot prod).

### 3d. Server actions per modul + gating RBAC (diverifikasi)

| Modul | Create | Edit | Delete | Read |
|---|---|---|---|---|
| Kas (`kas/actions.ts`) | `canCreate` | `canEdit` | **owner-only** | sesi |
| Biaya | `canCreate` | `canEdit` | **owner-only** | sesi |
| Harga | `canCreate`¹ | — | **owner-only** | sesi |
| Pembelian | `canCreate` | `canEdit` | **owner-only** | sesi |
| Penjualan | `canCreate` | `canEdit` (status & full) | **owner-only** | sesi |
| Peron | `canCreate` | `canEdit` (**field `keuntunganPerKg` = owner-only**) | **owner-only** | sesi |
| Modal peron | `canCreate` | — | **owner-only** | sesi |
| Retensi (`peron/retensi-actions.ts`) | catat ancaman | terapkan margin = **owner-only** | — | sesi |
| Pengguna (`pengaturan`) | **owner-only** (add/role/email/reset/permissions) | | **owner-only** (delete) | — |
| Pajak (ppn/pph status) | **owner-only** | — | — | `canViewFinance` |
| App settings | set = **owner-only** | | | get = sesi |
| Laporan | — | — | — | `canViewFinance` |

¹ Batch 1: `createHargaAcuan` (single) kini **menulis `activity_log`** (konsisten dgn batch & delete). Modul Laporan menambah `getPembelianBulanan` (rekap tonase/nilai pembelian per peron & kategori per bulan, tab "Pembelian Bulanan"; `canViewFinance`).
**Delete gating: SERAGAM owner-only di semua modul** (dulu "campur" — kini konsisten).

---

## 4. RBAC (`lib/permissions.ts`)

5 peran: **owner** (semua), **admin** (semua kecuali `canManageUsers`), **kasir** (`canCreate` saja), **akuntan** (`canViewFinance` saja), **viewer** (`canViewFinance` saja). Normalisasi role ke lowercase; **peran tak dikenal → `noPermissions` (fail-CLOSED)**. `requirePermission()` melempar error.

**Visibilitas nav (`lib/nav-routes.ts`):** `APP_ROUTES` = **sumber tunggal** rute non-tab (Shortcut Grid + Command Palette). Filter via `visibleRoutes(isOwner, perms)` — `ownerOnly` (Pengaturan) & `perm` per-user (pembelian/penjualan/kas/biaya dari `user.permissions` JSON). Active-state pakai **longest-match** (`matchRoutePath`) → `/peron` tak menang untuk `/peron/kesehatan`; Dashboard hanya aktif saat exact `/dashboard`.

---

## 5. Struktur File (ringkas)

```
app/
  (auth)/login/            layout + page
  (dashboard)/
    layout.tsx             shell + bottom-nav + owner guard pengaturan
    dashboard|pembelian|penjualan|kas|biaya|laporan|harga/  page + actions + client
    peron/                 page, [id], actions, retensi-actions, kesehatan/{page,[id]}
    pengaturan/            layout(owner) + page + 10 sub + actions + settings-client
    profil/
  api/                     12 route (lihat §3c)
  p/[token]/               portal publik (page, loading, not-found, portal-actions, data)
  page.tsx offline/ layout.tsx
components/                bottom-nav, row-action-menu, form-dialog per modul, tabel, ui/*, chart, dst
lib/
  db/{schema.ts,index.ts}  auth.ts auth-client.ts permissions.ts
  harga.ts pajak.ts retensi.ts saldo.ts format.ts
  nav-routes.ts nav-visibility-store.ts settings-groups.ts
  notification.ts telegram-recipients.ts telegram-snapshots.ts
  audit.ts logger.ts backup.ts share.ts foto-url.ts report-client-error.ts
  peron-health/ peron-portal/ __tests__/ (6 test)
scripts/                   add-*.ts (migrasi additif), seed*.ts, reset/verify-password, check-db, migrate-to-detail, gen-pwa-icons
drizzle/                   VESTIGIAL (README peringatan; SQL basi, bukan sumber kebenaran)
proxy.ts next.config.ts vercel.json instrumentation.ts vitest.config.ts
```

---

## 6. Konvensi & Pola

- **Angka/tanggal (`lib/format.ts`):** `formatRupiah` (Intl id-ID, 0 desimal), `formatCompact` ("Rp 1,23 M/jt/rb" untuk glance), `formatTanggal`/`formatTanggalLengkap`. **WIB:** `jakartaDateString(offsetDays)` + `todayString()` (Asia/Jakarta, en-CA) = sumber tanggal transaksi (hindari mundur-1-hari di server UTC). Helper nota replas: `formatRentangKotak`, `notaReplasBaris` ("N | tanggal", pemisah `|` ASCII), `buildKeteranganReplas`/`notaKeteranganReplas` ("Total N Replas", derive saat render), `isAutoKeteranganReplas`.
- **Model harga (`lib/harga.ts`) — 100% derive, tanpa hardcode tersebar:** `SELISIH_JUAL_BGA=120` (tetap), `CAP_KEUNTUNGAN_PERON=50`. `Harga Jual BGA = acuan + selisih`; `kelebihan peron = selisih − keuntunganPerKg`; **clamp SATU kali** di `effectiveKelebihanPeron` (non-TBS `min(raw, 50)` → untung CV floor ≥70; TBS bebas). Peron **"Umum"** = satu baris `nama='Umum'` dgn `keuntunganPerKg=90` (kelebihan 30 flat) — **tak ada cabang per-nama di logika harga** (name-agnostic; `PERON_UMUM_NAMA` hanya untuk MENGECUALIKAN dari cockpit retensi).
- **Pajak (`lib/pajak.ts`):** `TARIF_PPN=0.11`, `TARIF_PPH_BADAN=0.22`, `DEFAULT_PPH25_NOMINAL=698_917`. Fungsi murni teruji unit. **Batch 1:** tarif dari `app_settings` (`tax_tarif_ppn`/`tax_tarif_pph_badan`, disimpan sbg PERSEN string mis. "11") kini **di-wire** ke kalkulasi via `parseTarifPersen(stored, fallback)` (validasi 0<persen<100; kosong/tak valid → default). Dipakai di `getPajakData` (PPN) & `getLabaRugiTahunan` (PPh Badan). ⚠️ **PPN dihitung LIVE** (bukan dari `ppn_bulanan.totalPpn` tersimpan) → ubah tarif memengaruhi angka PPN semua bulan tampil, termasuk yg sudah setor; nominal setoran historis di DB tak berubah. Beku: `pph_bulanan.nominal` (PPh25) & total PPh25 tersetor.
- **Warna & token (`app/globals.css`):** aksen **emerald** (`--brand` `#0B6E4F` light / `#35C892` dark). 3 warna semantik fungsional: `--ok` (emerald), `--warn` (amber), `--crit` (merah teredam). **`--destructive` sengaja NETRAL** (`#78716C`/`#9CA3AF`) — tombol hapus bukan merah terang. Oranye/amber mentah = benar-benar nol pada UI non-warning (aturan override di globals menetralkan class Tailwind orange/amber liar). Motion pakai `--ease-out-expo`.
- **Navigasi:** bottom-nav **ikon-only** (label = `aria-label`); Shortcut Grid + Command Palette dari `APP_ROUTES`; active-state **longest-match**. `/peron` + `/peron/kesehatan` masih **route terpisah** (hub bertab BELUM dibuat).
- **Pola data:** transaksi keuangan otomatis → `transaksi_kas` via `refTabel`/`refId` (idempotency key deterministik `${tabel}:${id}`); form kas manual TIDAK bisa set `refTabel/refId`. **Batch 1:** entri kas manual dibatasi ke kategori **`tarik_bri`/`penyesuaian`/`lainnya`** (validasi server via `kasCreateSchema` + guard update; kategori auto `penerimaan_bga`/`bayar_peron`/`modal_peron`/`kembali_modal`/`biaya_operasional` hanya dibuat sistem). Foto via Vercel Blob. `app_settings` key-value lintas perangkat. Saldo = **turunan** (`saldoAwal + Σmasuk − Σkeluar`), tak pernah disimpan mutable. Paired-insert dibungkus `db.transaction`.
- **Telegram:** multi-penerima via `getTelegramChatIds()` (`TELEGRAM_CHAT_IDS` koma, dedup Set; `TELEGRAM_CHAT_ID` fallback bila kosong); fan-out `Promise.allSettled`.

---

## 7. Gotcha & Utang Teknis (untuk cegah salah baca)

1. **`proxy.ts` bukan `middleware.ts`** (Next 16). Proxy hanya cek keberadaan cookie; auth/role asli di tiap action.
2. **Build fail-on-type-error** (`ignoreBuildErrors:false`) + **Turbopack** → wajib `tsc` hijau sebelum deploy.
3. **DILARANG `drizzle-kit push/migrate` sebagai sumber kebenaran.** Skema di `schema.ts`; migrasi = `scripts/add-*.ts` additif di `vercel-build`. Folder `drizzle/` VESTIGIAL & basi.
4. **Dua library primitif UI** (`@base-ui/react` + `@radix-ui/*`) berdampingan — migrasi setengah jalan (utang teknis).
5. **WIB:** tanggal transaksi WAJIB via `todayString()`/`jakartaDateString()`. Batch 1 memperbaiki `api/metrics` (dulu `new Date().toISOString()` → salah hari dini hari WIB, kini `todayString()`). Tersisa `new Date().toISOString()` yang SAH: timestamp instant (metrics:112/logger/backup:96/settings:424), penamaan file backup (`backup.ts:181`, key arsip) & filename unduhan config klien (`settings-client:432`) — bukan tanggal transaksi/display.
6. **Portal `/p/[token]` dipaksa terang** (`colorScheme:'light'`) apa pun tema app.
7. **FK cascade Turso tak aktif** → child dihapus eksplisit di action (jangan andalkan DB cascade).
8. **Snapshot histori:** `pembelian.keuntunganPerKg` beku; jangan hitung ulang histori dari `peron.keuntunganPerKg` live.
9. **Tarif pajak app_settings kini TER-WIRE** (Batch 1) — tersimpan sbg PERSEN string ("11"), dibaca via `parseTarifPersen`. Ingat: PPN dihitung LIVE (ubah tarif menggeser angka semua bulan tampil, termasuk yg sudah setor); nominal setoran historis di DB tetap.
10. **Skrip migrasi lama** (`migrate-to-detail`, `add-idempotency-columns`, `add-peron-access-table`, `add-peron-health-tables`) TIDAK di `vercel-build` (sudah diaplikasikan manual sebelumnya) — asumsikan sudah jalan di prod.
