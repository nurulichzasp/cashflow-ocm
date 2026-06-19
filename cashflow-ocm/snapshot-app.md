# 📸 Snapshot Teknis — Cashflow OCM

> **Sumber kebenaran kode. Diverifikasi langsung dari source (bukan ingatan/README/snapshot lama).**
> HEAD kode: `3319ecd` · Branch `main` = `origin/main` (0 ahead / 0 behind) · **fully deployed** ke produksi (Vercel `cashflow-ocm-d61i` → omandacerli.com).
> Status pohon kerja saat snapshot dibuat: **bersih** (tak ada perubahan kode belum-commit). Snapshot ini menggantikan snapshot 13 Jun pagi (HEAD `d439cfd`).

---

## Perubahan sejak 13 Juni 2026 (HEAD `d439cfd` → `0fe0f0d`)

21 commit. Tiga gelombang:

### A. Fitur & redesign (6 commit) — terverifikasi
| Commit | Perubahan |
|---|---|
| `589ebac` | **Ganti email login** pengguna (owner-only) — action `updateUserEmail` di `pengaturan/actions.ts` (ganti `user.email` Better Auth, sesi tak putus). ✅ landing. |
| `e13e111` | Entri app **selalu** WelcomeScreen → login (hapus auto-skip authed); `manifest.start_url` `/` |
| `33fb5da` | **Redesain Beranda** jadi pusat kendali mobile-first (hero Total Kas, 4 aksi cepat, carousel akun, margin/volume, kesehatan peron, transaksi) |
| `81a56e8` | **Command Palette** upgrade → pencarian data lintas modul (`lib/search-actions.ts` `searchAll`) |
| `4bd6f37` | Pembelian: ringkasan dobel → satu hero filter-aware |
| `034f0fa` | Penjualan: 4-kartu → hero premium |

### B. Sistem warna semantik (3 commit) — terverifikasi di `globals.css`
- `ab6b781` Token fungsional `--ok/--warn/--crit` + `.pill-*`/`.text-*` + komponen `StatusPill`; CTA emerald (Button default); hero emerald gelap; saldo/laba negatif merah-teredam.
- `1cbaad9`, `6ebf4a9` Polish hero Total Kas (akhirnya: dasar netral `#18181B` + aksen hijau tipis, sama di light/dark).

### C. Audit UI/UX menyeluruh — 12 batch (`d342a7a` → `0fe0f0d`) — **delta utama**
| Batch (commit) | Area & file yang berubah |
|---|---|
| 1 `d342a7a` | **5 P0**: badge TBS `harga-table.tsx`; badge Aktif peron → `StatusPill`; mutasi `modal-history-table.tsx` → `.text-masuk/.text-keluar`; padding `followup-sheet.tsx`; label "Hapus Transaksi" `settings-client.tsx` → `.text-crit` |
| 2 `65a4280` | **Token destruktif/status**: tombol hapus `bg-red-600` → `Button variant="destructive"`; trash hover → token; asterisk/Keluar/Danger Zone → `.text-crit`; untung → `.text-ok`; badge amber → `--warn`; offline wifi → `#FBBF24`; Ekspor green → netral (penjualan/kas/pembelian/harga/peron-table, profil-client, profile-dialog, notifikasi, offline) |
| 3 `b18c89f` | **a11y/focus/tap**: hapus `maximumScale:1` (`layout.tsx`); `button.tsx` focus ring base → `ring-brand`; quick-actions focus; followup-sheet CTA focus; `theme-selector` `role=radiogroup`; Dialog/Sheet close `.tap-pad`; lightbox `foto-bukti-gallery` role=dialog+Esc+aria |
| 4 `4f1456b` | **Dark parity + loading**: `CashflowChart` tooltip hex → token; biaya/harga thead+hover `dark:`; kartu mobile biaya/harga/kas → `.surface`; bottom-nav surface adaptif light (`bg-white/60`); +4 `loading.tsx` (pengaturan, profil, peron/[id], peron/kesehatan/[id]) |
| 5 `62276a8` | **Polish**: biaya pill kategori → `StatusPill`; amber sisa → `--warn`; mikrocopy ("Transksi"→"Transaksi", "Zona Berbahaya", sr-only "Tutup"); ikon (Shield→Palette, FotoCount ImageOff→Image); kas hapus `dark:text-[#6B7280]`; `error.tsx` 60vh→60dvh |
| 6 `43524ab` | **Tap/ARIA/loading**: laporan tab `py-3`+`role=tablist`; toggle PPN/PPh `.tap-pad`+aria; SEMUA skeleton (`skeletons.tsx` + semua `loading.tsx`) `aria-hidden`→`role=status`+sr-only "Memuat…"; dashboard skeleton hero #18181B; settings tabel pengguna hex→`bg-card`; penjualan No.Invoice `<textarea>`→`<Textarea>` |
| 7 `55e14fa` | truncate nama panjang `peron/[id]`; CLS avatar `profil-client`; tap-pad hapus-baris pembelian; aria-hidden glyph carousel |
| 8 `cd1d6c0` | **Portal/themeColor/foto**: `/p/[token]` dipaksa terang (`colorScheme:light` + `bg-white`→hex); `layout.tsx` `themeColor` statis → **adaptif** (light `#FAFAF9`/dark `#191919`); galeri foto onError → placeholder |
| 9 `b42ff01` | **Profil & Pajak → SERVER**: actions `getAppSettings`/`setAppSettings` (batch, owner-only); `perusahaan`/`pajak` page ambil nilai server-side → initial props (tanpa flash, fix flicker modalAwal); localStorage tinggal fallback. **Konsekuensi: edit profil/pajak kini owner-only** (tombol disabled utk non-owner) |
| 10 `0594b2d` | **Validasi inline Tambah Pengguna** (`FieldError` per field + `aria-invalid` + `noValidate`); fix placeholder sandi "6"→"8" |
| 11 `fbcabde` | **Validasi inline pembelian per-baris** (baris setengah-isi ditandai merah, tak di-drop diam-diam) |
| 12-13 `0fe0f0d` | **CTA emerald** (9 tombol Simpan/Tambah di settings/profile-dialog/thermal hapus override `bg-stone-900/dark:bg-white` → Button default emerald); **validasi inline Pajak** (4 field: tarif 0–100%, nominal ≥0) |

> Follow-up `3319ecd`: `components/offline-indicator.tsx` amber-500 → token `--warn` → **oranye benar-benar NOL** (sweep `app`+`components` bersih).

---

## 1. Stack & Versi

| Komponen | Versi (`package.json`) | Catatan |
|---|---|---|
| Next.js | `^16.2.9` | App Router; build **Turbopack** |
| React / React DOM | `^19.2.7` | |
| Better Auth | `^1.6.16` | email+password, sesi cookie |
| Drizzle ORM / Kit | `^0.45.2` / `^0.31.10` | |
| @libsql/client | `^0.17.3` | Turso (SQLite) |
| @base-ui/react | `^1.5.0` | Button, Sheet, Select, AlertDialog, Dropdown |
| @radix-ui (dialog/checkbox/select/slot) | dialog `^1.1.16`, checkbox `^1.3.4`, select `^2.3.0`, slot `^1.2.5` | ⚠️ **dua library primitif** (lihat §6) |
| @vercel/blob | `^2.4.0` | upload foto + backup terjadwal |
| lucide-react | `^1.17.0` | ikon |
| motion | `^12.40.0` | animasi (`motion/react`) |
| next-themes | `^0.4.6` | light/dark via class |
| recharts | `^3.8.1` | chart |
| react-hook-form / @hookform/resolvers / zod | `^7.78.0` / `^5.4.0` / `^4.4.3` | |
| sonner | `^2.0.7` | toast |
| tailwindcss / @tailwindcss/postcss | `^4` | Tailwind v4 (`@theme` di CSS) |
| tailwind-merge / clsx / cva | `^3.6.0` / `^2.1.1` / `^0.7.1` | |
| date-fns | `^4.4.0` | |
| xlsx | CDN `0.20.3` (sheetjs) | parse BAST + backup XLSX |
| typescript / tsx | `^5` / `^4.22.4` | |
| shadcn | `^4.11.0` | |

**Build & deploy** (`next.config.ts`): `typescript.ignoreBuildErrors: false` (type error = build GAGAL), `turbopack: {}`, `serverExternalPackages` (better-auth, @libsql/client, drizzle-orm, xlsx, dll). Deploy: push `main` → auto-deploy Vercel. Script `vercel-build`: `tsx scripts/add-replas-fields.ts && tsx scripts/add-app-settings-table.ts && next build` (migrasi idempotent dulu, baru build).

**Cron** (`vercel.json`): `/api/cron/daily-summary?mode=morning` @ `0 0 * * *` & `?mode=evening` @ `0 11 * * *` (UTC).

**Env penting** (`.env.example`): `TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET` (wajib prod, kalau tidak cron 401), `BACKUP_TOKEN`, `TELEGRAM_BOT_TOKEN`/`_CHAT_ID`/`_WEBHOOK_SECRET` (opsional), `NEXT_PUBLIC_OCM_WHATSAPP` (opsional, tombol WA portal), `ADDITIONAL_TRUSTED_ORIGINS`.

---

## 2. Skema Database — **24 tabel** (`lib/db/schema.ts`, SQLite/Turso)

### KONVENSI NILAI (✅ terverifikasi dari schema)
- ✅ **Uang = `integer`** (rupiah bulat): `saldoAwal`, `jumlah`, `hargaLapangan`, `totalBeli/Jual`, `keuntungan`, `totalBersih/Nilai`, `nominal` (pph), `totalPpn`, `keuntunganPerKg`, `selisihJualBga`.
- ✅ **Kg/tonase = `real`** (berat bisa pecahan): `pembelian.tonase`, `pembelianDetail.tonase`, `penjualanDetail.qtyKg`, `peronSnapshot.totalKg`, semua `share*`.
- ✅ **Tanggal transaksi = `text` "YYYY-MM-DD"**: `tanggal`, `tanggalBerlaku/Bayar/Setor/BayarBga`, `tanggalReplas(Sampai)`, `weekStart`, `lastSetorDate`; bulan pajak `text` "YYYY-MM".
- ✅ **Timestamp sistem = `integer` (unixepoch)**: `createdAt/updatedAt/computedAt/issuedAt/lastViewedAt` (`{ mode: 'timestamp' }` default `(unixepoch())`).
- **ID**: kebanyakan `text` PK default `(lower(hex(randomblob(8))))`; Better Auth pakai `text` id; `peronSnapshot`/`peronFollowup` pakai `integer` autoincrement.

### Tabel per kelompok
| Kelompok | Tabel |
|---|---|
| **Auth (Better Auth)** | `user`, `session`, `account`, `verification` |
| **Master data** | `akun_kas`, `peron`, `modal_peron`, `harga_acuan` |
| **Transaksi inti** | `pembelian` (+`pembelian_detail`, `pembelian_foto`), `penjualan` (+`penjualan_detail`), `biaya_operasional` (+`biaya_foto`), `transaksi_kas` |
| **Pajak / settings / audit** | `ppn_bulanan`, `pph_bulanan`, `app_settings` (key-value), `activity_log` |
| **Kesehatan Peron** | `peron_snapshot`, `peron_health`, `peron_access`, `peron_followup` |

**Enum penting**: `user.role` text (default `viewer`); `pembelian.kategori` (OCM R1/R2/SAGU/BRDL/BRDL KTWM/TRYM/LMDM); `harga_acuan.produk` (TBS/BRDL KTWM/TRYM/LMDM); `transaksi_kas.kategori` (8 nilai); `transaksi_kas.arah` (masuk/keluar); `peron_health.status` (normal/perhatian/kritis/data_kurang).

**Relasi inti**: `pembelian → peron, akunKas(sumberBayar), user`; `pembelian 1—N pembelian_detail/foto`; `penjualan 1—N penjualan_detail`; `biaya → akunKas, user, 1—N foto`; `transaksi_kas → akunKas`; `peron 1—N modal_peron/snapshot/followup, 1—1 peron_health/peron_access`. Foto & detail `onDelete: cascade`.

**Idempotency**: `uniqueIndex` `idempotency_key` di 5 tabel transaksi — `modal_peron`, `pembelian`, `penjualan`, `biaya_operasional`, `transaksi_kas` (cegah dobel-submit).

---

## 3. Modul & Route

### Halaman (`app/`)
**Publik** (bypass auth proxy): `/` (welcome, exact-match), `/login`, `/offline`, `/p/[token]` (portal peron read-only). **Ter-gate** (butuh sesi, redirect `/login`): dashboard, pembelian, penjualan, kas, biaya, laporan, harga, peron, peron/[id], peron/kesehatan, peron/kesehatan/[id], profil, dan **pengaturan** + sub: `cadangan, harga, notifikasi, pajak, pengguna, perusahaan, printer, tampilan, tentang`. (26 `page.tsx` total.)

**Gate auth = `proxy.ts`** (BUKAN `middleware.ts` — Next 16). `publicPaths`: `/login, /api/auth, /api/cron, /api/peron-health, /api/backup, /api/telegram, /api/parse-bast, /manifest.webmanifest, /sw.js, /offline, /p/` (`/p/` **wajib trailing slash**). `/` di-handle `pathname === '/'` exact.

### API Route (`app/api/`)
| Route | Method | Auth (dari kode) | Fungsi |
|---|---|---|---|
| `/api/auth/[...all]` | GET, POST | Better Auth handler | Login/sesi/logout |
| `/api/backup` | GET | sesi + **owner-only** | Download backup (XLSX/JSON) |
| `/api/backup` | POST | `Bearer BACKUP_TOKEN` (timing-safe) | Backup terjadwal → Vercel Blob |
| `/api/cron/daily-summary` | GET | `Bearer CRON_SECRET` / `?secret=` | Briefing pagi + rekap sore + rebuild kesehatan |
| `/api/foto` | GET | sesi | Proxy foto dari Blob (whitelist host) |
| `/api/health` | GET / POST | **owner-only** (POST butuh frasa `HAPUS-SEMUA-DATA`) | Diagnostik DB / **hapus semua data transaksi** |
| `/api/metrics` | GET | sesi + `canViewFinance` | Metrik keuangan |
| `/api/notify` | POST | sesi | Kirim notifikasi Telegram |
| `/api/parse-bast` | POST | sesi (cek di handler) | Parse PDF/Excel BAST/rekap BGA |
| `/api/peron-health/refresh` | GET | `Bearer CRON_SECRET` / `?secret=` | Rebuild cache kesehatan peron |
| `/api/telegram/webhook` | POST / GET | header `X-Telegram-Bot-Api-Secret-Token` / `?secret=` + whitelist chat | Bot command / setup webhook |
| `/api/upload-foto` | POST | sesi | Upload foto → Blob (validasi magic-bytes) |

### Server Actions (per modul) — gating dari kode
Pola umum: **read** = `requireSession()`; **create/edit** = `requirePermission(role, 'canCreate'/'canEdit')`; **delete** = bervariasi (lihat §6).
- **pembelian**: `createPembelian`(canCreate), `updatePembelian`(canEdit), `deletePembelian`(**canDelete**), `getPembelianList`, `getAkunKasList`, `getEstimasiLaba`, `getKeuntunganPerKg`, `getLatestHargaAcuan`, `getHargaAcuanListForProduk` (read=sesi).
- **penjualan**: `createPenjualan`(canCreate), `updatePenjualanStatus`/`updatePenjualan`(canEdit), `deletePenjualan`(**owner-only**), `getPenjualanList`.
- **kas**: `createTransaksiKas`(canCreate), `updateTransaksiKas`(canEdit, blok entri auto via `refTabel`), `deleteTransaksiKas`(**owner-only**), `getAkunKasList`, `getKasTransactions`.
- **biaya**: `createBiayaOperasional`(canCreate), `updateBiayaOperasional`(canEdit), `deleteBiayaOperasional`(**canDelete**), `getBiayaList`.
- **harga**: `createHargaAcuan`(canCreate), `deleteHargaAcuan`(**owner-only**), `getHargaList`, `getHargaAktif`.
- **laporan**: `getLaporanData`, `getPajakData`, `getLabaRugiTahunan`, `getNeracaData` (semua `canViewFinance`).
- **peron**: `createPeron`(canCreate), `updatePeron`(canEdit), `deletePeron`(**owner-only**), `addModalPeron`(canCreate), `deleteModalPeron`(**owner-only**), `getPeronList`, `getPeronById`.
- **peron/health-actions**: `getPeronHealthList`, `getPeronHealthDetail`, `refreshPeronHealth`, `createFollowup`, `archivePeron` (sesi).
- **peron/portal-actions**: `getPeronAccess`, `generatePeronToken`, `revokePeronToken` (sesi).
- **pengaturan**: `updateProfile`(sesi); `addUser`/`deleteUser`/`updateUserRole`/`updateUserEmail`/`resetUserPassword`/`updateUserPermissions`/`updatePpnStatus`/`updatePphStatus`/`setAppSetting`/`setAppSettings` (**owner-only**); `getPpnList`/`getPphList`(canViewFinance); `getAppSetting`/`getAppSettings`(sesi).

### RBAC (`lib/permissions.ts`)
Peran: `owner, admin, kasir, akuntan, viewer`. Matrix 6 izin (`canCreate/Edit/Delete/ViewFinance/ManageUsers/ApproveTransactions`). `owner`=semua; `admin`=create/edit/delete/finance/approve (tanpa manage-users); `kasir`=create saja; `akuntan`/`viewer`=view-finance saja. Peran tak dikenal → `noPermissions` (**fail-closed**, role di-lowercase). `requirePermission()` lempar error utk server actions. **Visibilitas nav** (`nav-routes.ts` `parsePerms` + `visibleRoutes`): owner lihat semua; non-owner ikut permissions JSON per-modul; `/pengaturan` `ownerOnly`.

---

## 4. Struktur File (relevan)
```
app/
  (auth)/login/                 page
  (dashboard)/                  layout, loading, error
    dashboard/  pembelian/  penjualan/  kas/  biaya/  laporan/  harga/
    peron/  peron/[id]/  peron/kesehatan/  peron/kesehatan/[id]/
    profil/  pengaturan/{,harga,notifikasi,pajak,pengguna,perusahaan,printer,tampilan,tentang,cadangan}/
    (tiap modul: page.tsx, loading.tsx, actions.ts, *-form-dialog.tsx, *-table.tsx)
  api/ (12 route)  ·  p/[token]/  ·  offline/  ·  page.tsx (welcome)
  layout.tsx  globals.css  manifest.ts  global-error.tsx
components/
  bottom-nav, mobile-header, mobile-page-header, scroll-shell, sidebar,
  desktop-sidebar, swipe-navigator, fab, shortcut-grid, command-palette,
  empty-state, skeletons, animated-rupiah, number-input,
  foto-bukti-{gallery,uploader}, theme-{provider,selector}, profile-dialog,
  welcome-screen, splash-screen, offline-indicator, date-range-{filter,inline}
  charts/{CashflowChart,CashflowChartLazy}
  ui/ (18 primitif: button, input, textarea, label, field-error, dialog, sheet,
       alert-dialog, dropdown-menu, select, checkbox, switch, card, badge,
       status-pill, separator, table, sonner) + origin/checkbox
lib/
  auth, auth-client, db/{index,schema}, permissions, nav-routes,
  nav-visibility-store, format, utils, foto-url, audit, backup, notification,
  search-actions, settings-groups, telegram-snapshots,
  peron-health/{config,rebuild,status-meta,week}, peron-portal/data
hooks/  use-dashboard-metrics, use-offline
scripts/ (migrasi idempotent + seed + util):
  add-app-settings-table, add-replas-fields (keduanya di vercel-build),
  add-idempotency-columns, add-peron-access-table, add-peron-health-tables,
  migrate-to-detail, seed, seed-peron, check-db, reset-password,
  verify-password, gen-pwa-icons.cjs,
  set-umum-kelebihan-30 (migrasi DATA sekali-jalan, idempotent; SET peron "Umum" untung/kg=90; TIDAK di vercel-build)
proxy.ts (auth gate)  ·  vercel.json  ·  next.config.ts
public/ icon-{192,512,maskable}.png, sw.js
```

---

## 5. Konvensi & Pola

**Nilai & format** (`lib/format.ts`): `formatRupiah` (presisi penuh, tabel/form), `formatCompact`/`formatCompactValue` ("Rp 1,23 M / 296,8 jt / 45 rb", utk hero/KPI), `formatNumber`, `formatTanggal`/`formatTanggalLengkap`/`formatTanggalPendek`, `formatRentangKotak`/`formatRentangReplas` (rentang replas), `buildKeteranganReplas` ("Total N Replas (rentang)" — SATU sumber; **TANPA data replas / total replas <1 → "" (baris hilang), bukan lagi "Total 0 Replas"**), `notaKeteranganReplas` (wrapper nota: di-derive saat render dari field replas + hormati teks manual; **SATU sumber identik di SEMUA mode nota — A5, thermal preview, Thermer, gambar share**; ganti pola lama `keterangan?.trim() || …` yg bikin thermal "kadang muncul kadang tidak"), `isAutoKeteranganReplas` (deteksi pola auto vs manual). **WIB**: `jakartaDateString(offsetDays)`/`todayString()` pakai `Asia/Jakarta` (konsisten server UTC ↔ client). Angka uang wajib `.num`/`tabular-nums`.

**Warna** (`app/globals.css` `:root`/`html.dark`, Tailwind v4 `@theme`):
- Monokrom netral. Light `--background #FAFAF9` / `--foreground #1C1917` / `--card #FFFFFF` / `--border #E7E5E4`. Dark `#191919` / `#F3F4F6` / `#28282B` / `rgba(255,255,255,.07)`.
- Aksen tunggal **emerald** `--brand` #0B6E4F (dark #35C892), `--brand-solid` #0E7A57. Dipakai ≤10% (CTA, focus, nav aktif, link, monogram).
- Token fungsional: `--ok-fg` #0B6E4F→#35C892, `--warn-fg` #854F0B→#FBBF24, `--crit-fg` #A32D2D→#E68A8A (+`.pill-*`, komponen `StatusPill`). Keuangan: `--masuk` #16A34A, `--keluar` #DC2626, `--warning` #D97706.
- `--destructive` = **netral abu** (#78716C light / #9CA3AF dark) — **tombol hapus jadi abu, bukan merah** (disengaja). `--radius` 0.625rem.
- **Catch-all dark/light** di `globals.css` (di luar `@layer`) menetralkan kelas Tailwind warna mentah (`text-green/red/violet/blue`, `bg-*-50/100`). Komponen yg butuh warna bertahan harus pakai token/`.text-ok/crit`/hex eksplisit.
- **Oranye/amber mentah = NOL** ✅ — semua sinyal warning lewat token `--warn` (`--warn-fg/--warn-bg`), bukan `amber-500`/`orange-*` mentah.

**Tipografi**: system font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text"…`) — **Geist sudah dibuang**. `h1–h3` `text-wrap: balance`.

**Navigasi**:
- **Bottom-nav** (`components/bottom-nav.tsx`, mobile) = **IKON-ONLY — KEPUTUSAN FINAL (15 Jun 2026), JANGAN diubah ke berlabel** ✅ (verifikasi: `NavTab` render `<Icon>` saja; teks `label` hanya `aria-label`). Aturan lama/eksternal yang meminta nav berlabel sudah dibatalkan — ikon-only adalah kanonik. 5 slot: Beranda(grid) · Pembelian · **Cari** (tengah, command palette) · Penjualan(trending) · Lainnya(drawer "Pintasan"). Pill aktif gaya IG (liquid-glass; light `bg-white/60`).
- **Sidebar desktop** (`components/sidebar.tsx`/`desktop-sidebar.tsx`) = BERLABEL (10 item). **Dua sumber nav harus sinkron**: `lib/nav-routes.ts` (mobile/palette) & `sidebar.tsx`/`desktop-sidebar.tsx` (desktop).
- Active-state **longest-match** (`isRouteActive` di `nav-routes.ts`) — `/peron/kesehatan` ≠ `/peron`.
- **Toast** (sonner) `position="top-center"` + offset `safe-area-inset-top` (`globals.css`) → tak ketutup Dynamic Island.
- **Focus ring** `.neural-focus` = satu garis border `var(--focus-ring)` (emerald desaturasi) utk input; `Button` `focus-visible:ring-brand/50` (diseragamkan Batch 3).
- **State**: komponen `EmptyState` ada; **13 `loading.tsx`** di `(dashboard)`; `(dashboard)/error.tsx` + `global-error.tsx`; skeleton `role=status`+sr-only "Memuat…".
- **themeColor** (`layout.tsx` viewport) = **adaptif** array (light #FAFAF9 / dark #191919); `maximumScale` **dihapus** (pinch-zoom aktif). `viewportFit: cover`.

**Pola data**: server actions di tiap modul (`'use server'`); transaksi yg memutasi kas auto-buat `transaksi_kas` (`refTabel`/`refId`); foto via Vercel Blob (proxy `/api/foto`); `app_settings` key-value utk pengaturan global lintas-perangkat (`neraca_modal_awal`, `company_*`, `tax_*`).

---

## 6. Catatan / Gotcha & Utang Teknis

1. **Build = Turbopack**, `ignoreBuildErrors:false` → **type error = build gagal**. Wajib lulus `tsc --noEmit`. Hapus duplikat iCloud (`* 2.*`, `* 3.*`) di `.next` sebelum build lokal.
2. **Auth gate = `proxy.ts`** (bukan `middleware.ts`) — Next 16. `'/p/'` di `publicPaths` **wajib trailing slash**.
3. **JANGAN `drizzle-kit push/migrate`** — skema dikelola via skrip migrasi idempotent (`scripts/add-*`) yg jalan di `vercel-build`.
4. **Oranye = NOL** ✅ — semua warning pakai token `--warn` (`--warn-fg/--warn-bg`), bukan `amber-500`/`orange-*` mentah. (offline-indicator = pengecualian terakhir, difix `3319ecd`; sweep `app`+`components` bersih.)
5. ⚠️ **Dua library primitif UI**: `@base-ui/react` (Button, Sheet, Select, AlertDialog, Dropdown) + `@radix-ui` (Dialog, Checkbox). Belum disatukan (skip sadar; tak terlihat user).
6. ⚠️ **Gating delete tak seragam**: `deletePembelian`/`deleteBiaya` pakai `requirePermission('canDelete')`, tapi `deletePenjualan`/`deleteTransaksiKas`/`deleteHargaAcuan`/`deletePeron`/`deleteModalPeron` **owner-only**. Cek bila ingin konsisten.
7. **Edit Profil & Pajak kini owner-only** (sejak Batch 9 → `setAppSettings` owner-only). Non-owner: tombol disabled + pesan izin. `thermal_paper_width` tetap localStorage (per-perangkat, disengaja); `company_*`/`tax_*` kini server (localStorage = cadangan).
8. **Tombol hapus = abu (token `--destructive`), bukan merah** — disengaja (monokrom). Danger lewat teks `.text-crit` (asterisk wajib, label izin, Zona Berbahaya).
9. **Portal `/p/[token]` theme-agnostic**: dipaksa terang (`colorScheme:light` + hex eksplisit) apa pun tema sistem.
10. **Checkbox `components/ui/origin/checkbox.tsx` = dead code** (tak diimpor di mana pun); `components/ui/checkbox.tsx` juga tak terpakai (form pakai `Switch`).
11. **WIB**: selalu `jakartaDateString()`/`todayString()` utk tanggal (server Vercel = UTC).
12. ⚠️ **`scripts/setup-company-accounts.ts` TIDAK ADA** di repo (tak pernah landing). `updateUserEmail` **sudah landing** (`pengaturan/actions.ts`, commit `589ebac`).
13. **Idempotency**: form transaksi kirim `idempotencyKey` (uniqueIndex) — aman dari dobel-submit.
14. **Model harga (`lib/harga.ts`) — SATU sumber**: `SELISIH_JUAL_BGA=120` (tetap). **Kelebihan peron = 120 − `peron.keuntunganPerKg`** (bonus/kg di atas acuan yg dibayar ke peron). Clamp HANYA di `effectiveKelebihanPeron`: **non-TBS (brondolan) di-cap `CAP_KEUNTUNGAN_PERON=50`** → untung CV ter-floor ≥70; **TBS bebas** (tak di-cap). Untung CV/kg = 120 − kelebihan efektif. Per-peron, fully data-driven (form pembelian & peron baca `keuntunganPerKg` live; historis simpan `totalBeli/keuntungan` sendiri → tak ditulis ulang saat nilai peron berubah).
15. **Peron "Umum" = kelebihan 30/kg flat (override per-KATEGORI… sebenarnya per-PERON)** ✅ (19 Jun 2026). **"Umum" BUKAN kolom kategori — ia SATU peron biasa** (`nama='Umum'`, kode 7) di tabel `peron`. Aturannya dinyatakan via `keuntunganPerKg=90` → kelebihan = 120−90 = **30/kg**, untung CV ter-floor **≥90**. Karena 30 ≤ cap brondolan 50, kelebihan **seragam 30 untuk TBS DAN semua brondolan** (cap tak pernah mengikat; TBS-bebas tak relevan krn raw sudah 30). **Bedakan jelas**: ini khusus peron Umum — peron **non-Umum** TIDAK berubah (brondolan tetap cap ≤50, TBS tetap bebas). Tak ada angka 30 hardcoded (di-derive 120−90). Diterapkan ke prod via `scripts/set-umum-kelebihan-30.ts` + seed (`seed-peron.ts` Umum=90). Sebelumnya Umum=70 (kelebihan 50).

---
*Snapshot dibuat: 13 Juni 2026. Diperbarui 19 Juni 2026: peron "Umum" kelebihan 50→30 (untung CV ≥90, semua produk; via `keuntunganPerKg` 70→90) + nota keterangan replas thermal disatukan (`notaKeteranganReplas`, derive saat render, "Total 0 Replas" tak muncul).*
