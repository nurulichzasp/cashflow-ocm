# Temuan Audit Awal — Cashflow OCM

> **HEAD:** `b8400e0` (2026-07-01) · **Deploy:** `omandacerli.com` LIVE (HTTP 200) · **Tanggal:** 2026-07-05
> **Sifat:** READ-ONLY. Semua diverifikasi dari source. **Tidak ada kode yang diubah.** Ini laporan untuk di-review pemilik sebelum fase perbaikan.
> Pendamping: `snapshot-app-2026-07-05.md`.

---

## Bagian 1 — Git & Deploy (ringkas)

- **HEAD** = `b8400e0` *feat(retensi): cockpit retensi peron + kalkulator pertahanan harga*.
- **`main` = `origin/main`** (0 ahead / 0 behind).
- **Working tree KOTOR:** 2 file belum-commit → `app/(dashboard)/laporan/actions.ts` (+`getPembelianBulanan`, finance-gated, aman) & `laporan-client.tsx`. Fitur **Laporan Pembelian Bulanan** — WIP, **belum di-deploy**.
- **Delta sejak `e73983c` → HEAD:** hanya **2 commit** —
  - `9df7a93` (27 Jun) — *docs(snapshot): refresh ke e73983c + koreksi gating portal/health*.
  - `b8400e0` (1 Jul) — **Gelombang tunggal: Retensi Peron** (tabel `peron_ancaman`, `lib/retensi.ts`, `peron/retensi-actions.ts`, `/pengaturan/retensi`, kalkulator pertahanan harga).
  - Artinya snapshot pemilik hampir sinkron; yang **baru & mungkin belum terdokumentasi** = fitur Retensi + WIP Laporan Bulanan.

---

## Bagian 3 — Verifikasi Klaim (ADA / TIDAK ADA / SEBAGIAN)

| # | Klaim | Status | Lokasi & kondisi nyata |
|---|---|---|---|
| 1 | Merge Peron + Kesehatan jadi hub bertab | **TIDAK ADA** | `/peron` (`peron/page.tsx`) = list biasa (hero Total DP + `PeronTable`), tanpa segmented/tab. `/peron/kesehatan` + `/peron/kesehatan/[id]` **masih route terpisah**, dicapai via nav/command palette. Rencana merge **belum dikerjakan**. |
| 2 | Telegram multi-penerima | **ADA** | `lib/telegram-recipients.ts:11` `getTelegramChatIds()` parse `TELEGRAM_CHAT_IDS` (koma, dedup Set), fallback `TELEGRAM_CHAT_ID` hanya bila kosong. `lib/notification.ts:35` fan-out `Promise.allSettled`. |
| 3 | Peron Retention Cockpit | **ADA** | Tabel `peron_ancaman` (`schema.ts:358`). Kalkulator `lib/retensi.ts:111` `hitungPertahanan`. Ditulis oleh `peron/retensi-actions.ts` (`catatAncaman`, `terapkanDanCatat`). Default **loyalty threshold `RETENSI_DEFAULT_AMBANG=20`** (`retensi.ts:22`), **TBS floor `RETENSI_DEFAULT_MIN_MARGIN_TBS=40`** (`:24`) — konstanta **overridable** via app_settings `retention_loyalty_threshold`/`retention_min_margin_tbs` (`retensi-actions.ts:43`). |
| 4 | Owner-only pada margin | **ADA** | `applyRetentionMargin`/`terapkanDanCatat` → `requireOwner()` (`retensi-actions.ts:284,361`). Field `keuntunganPerKg` di `updatePeron` di-abaikan utk non-owner (`peron/actions.ts:98`), form read-only non-owner (`peron-form-dialog.tsx:102`). Gate = `role==='owner'`, bukan `canEdit`. |
| 5 | Model harga tanpa hardcode tersebar | **ADA** | `SELISIH_JUAL_BGA=120`, `CAP_KEUNTUNGAN_PERON=50` di `lib/harga.ts` saja; clamp 1× di `effectiveKelebihanPeron`. Non-TBS cap ≤50 (untung CV floor ≥70), TBS bebas. "Umum" = 1 baris `nama='Umum'`, `keuntunganPerKg=90` (kelebihan 30 flat) — **name-agnostic**, tak ada cabang per-nama di logika harga. Grep literal harga di app/lib: **tak ada bocor**. |
| 6 | Invarian UI | **SEBAGIAN (semua benar, 1 nuansa)** | `ignoreBuildErrors:false` **ADA**. Oranye/amber mentah **= nol pada UI non-warning** (yang ada = token semantik `--warn` + state ancaman di kalkulator retensi; sisanya rule override penetral). Bottom-nav **ikon-only ADA** (label=aria). Tombol hapus **netral ADA** (`--destructive` `#78716C`/`#9CA3AF`, bukan merah). Portal `/p/[token]` **dipaksa light ADA** (`page.tsx:67` `colorScheme:'light'`). |
| 7 | Gating delete (campur vs seragam) | **SERAGAM (owner-only)** | Semua `delete*` pakai `requireOwner()`: kas, biaya, harga, pembelian, penjualan, peron, modal, user. Kekhawatiran lama "campur" — **kini bersih.** |

---

## Bagian 4 — Temuan (per kategori · severity · lokasi · dampak · arah perbaikan)

> **Tidak ada P0.** Tidak ditemukan bypass otorisasi, korupsi saldo, atau jalur kehilangan data. Reset data (`health` POST) triple-gated (sesi+owner+frasa). Fokus riil ada di **P1**.

### 1. Keamanan & RBAC

| Sev | Lokasi | Temuan | Dampak | Arah perbaikan |
|---|---|---|---|---|
| P2 | `harga/actions.ts:35` `createHargaAcuan` | Tidak menulis `activity_log`, padahal `createHargaAcuanBatch` (`:63`) & `deleteHargaAcuan` (`:124`) menulis | Jejak audit tabel penggerak harga bolong; inkonsisten dgn semua create lain | Tambah `logActivity` di jalur single create (samakan dgn batch) |
| P2 | `lib/peron-portal/data.ts:28` | Token portal dibandingkan `eq()` SQL biasa (bukan constant-time) — satu-satunya secret non-timing-safe | Timing side-channel; dampak rendah (ruang 64-hex, per-peron, timing DB berisik) | Ambil by-peron lalu `timingSafeEqual`, atau terima sbg risiko rendah |
| P2 | root repo (`.env`, `.env.local`, `.env.loca`, `.env.vercel`, `.env.vercel-prod`) | 5 varian env lokal termasuk typo **`.env.loca`**; `.env.vercel-prod` menyimpan secret prod di disk lokal. **Tidak ter-commit** (`.env*` di-gitignore, hanya `.env.example` tracked) | Kebersihan/kebingungan; risiko bocor hanya bila disk bocor | Hapus `.env.loca` typo & varian tak terpakai; simpan prod secret hanya di Vercel |
| Info | (arsitektur) | Tidak ada role-gate global — `proxy.ts` hanya cek **keberadaan** cookie; role/permission dicek per-action | Route/action baru WAJIB ingat tambah gate sendiri (risiko struktural, bukan celah aktif) | Pertahankan disiplin; pertimbangkan helper wajib di tiap action baru |

**Bersih (diverifikasi baik):** portal publik tak bocorkan margin/hargaJual/keuntungan/data peron lain (proyeksi kolom eksplisit `data.ts:37`); semua secret **fail-closed** (env kosong → 401; `BETTER_AUTH_SECRET` kosong → throw boot); delete seragam owner-only; secrets tak ter-commit.

### 2. Integritas Data & Kas

| Sev | Lokasi | Temuan | Dampak | Arah perbaikan |
|---|---|---|---|---|
| **P1** | `laporan/actions.ts:251,298` + `lib/pajak.ts` | **Tarif pajak dari app_settings TIDAK di-wire.** `hitungPpn`/`hitungPphBadan` dipanggil tanpa argumen tarif → selalu default 11%/22%. Owner bisa ubah tarif di `/pengaturan/pajak` (tersimpan ke `app_settings` + `localStorage`), tapi laporan mengabaikannya | Owner mengira sudah ganti tarif; laporan/estimasi pajak salah & menyesatkan secara finansial. Juga tarif disimpan ke localStorage (per-device, bisa beda antar perangkat) | Teruskan tarif tersimpan ke `hitungPpn/PphBadan` (param sudah disiapkan); jadikan `app_settings` satu-satunya sumber (buang localStorage) |
| **P1** | `api/metrics/route.ts:84` | `today = new Date().toISOString().slice(0,10)` dipakai memfilter `tanggal` WIB (`:88,:93`) | Dini hari WIB (±00–07 WIB) KPI "hari ini" di dashboard tampil angka **hari kemarin** ~7 jam/malam. Display-only (bukan korupsi tulis) | Ganti ke `todayString()`/`jakartaDateString()` |
| P2 | `kas/actions.ts:30` | Form kas manual mengizinkan label kategori auto (`penerimaan_bga`, `bayar_peron`, dst) — tapi `refTabel/refId` TIDAK bisa di-set → tak bisa menyamar sbg baris auto | Kosmetik/pelaporan (label rancu), **bukan** forgery saldo (saldo tetap benar) | Persempit enum form manual ke kategori non-auto (`penyesuaian`/`lainnya`/`tarik_bri`) |
| P2 | `kas/actions.ts:77` | `createTransaksiKas` manual set `idempotencyKey` hanya bila klien kirim; bila `undefined`, index unik tak berlaku (SQLite izinkan banyak NULL) → proteksi hanya dup-check 60 detik | Retry >60 detik bisa double-insert entri kas manual (low likelihood) | Generate key deterministik/otomatis utk semua entri manual |

**Bersih (diverifikasi baik):** saldo = turunan murni, tak ada kolom/`update` saldo mutable (`saldo.ts:27`, `laporan:83,339`); `keuntunganPerKg` di-**snapshot & beku** per tiket (`pembelian/actions.ts:142,264`) — ubah margin peron tak menulis ulang histori; paired-insert dibungkus `db.transaction` (semua modul); tak ada pembagian-nol tak-terjaga (semua per-kg pakai `>0 ? … : 0`); tanggal transaksi WRITE semua via `todayString()`.

### 3. Konsistensi & Dead Code

| Sev | Lokasi | Temuan | Dampak | Arah perbaikan |
|---|---|---|---|---|
| **P1** | `nav-routes.ts:31` vs `sidebar.tsx:29` vs `bottom-nav.tsx:22` | **Nav 3 sumber.** `APP_ROUTES` diklaim "sumber kebenaran" tapi sidebar & bottom-nav hardcode array sendiri; hanya shortcut-grid/command-palette/mobile-header yg pakai `APP_ROUTES`. Logika filter-perm juga diduplikasi (`sidebar.tsx:108,208` vs `visibleRoutes()`) | Tambah/rename route = edit 3 tempat; sidebar/bottom-nav bisa diam-diam beda dari palette | Jadikan sidebar & bottom-nav meng-konsumsi subset `APP_ROUTES`; hapus array & filter duplikat |
| P2 | `scripts/` | 10 skrip one-off tak di-wire ke npm/build (mis. `migrate-to-detail`, `add-idempotency-columns`, `add-peron-access-table`, `add-peron-health-tables`, `check-db`, `reset/verify-password`, `seed-peron`, `set-umum-kelebihan-30`, `gen-pwa-icons`) — vestigial, sudah diaplikasikan | Kebingungan developer / drift; nol risiko runtime | Arsipkan ke `scripts/_archive/` + README kecil |
| P2 | `package.json:38` (`react-select`)… | **Bukan** dependency; yang dipakai `@radix-ui/react-select` (`ui/select.tsx:4`). Grep `from 'react-select'` = 0 | Dependency yatim (bundle/supply-chain) | Hapus dari `package.json` bila memang tak dipakai (verifikasi ulang dulu) |
| P2 | `schema.ts:257` + `pajak.ts` + `settings-client.tsx:169` | Angka `698917` (PPh25 default) diulang di 3 tempat | Bisa drift bila diubah satu saja | Jadikan `DEFAULT_PPH25_NOMINAL` satu sumber, referensikan di ketiganya |

**Bersih:** tak ada komponen `components/` yang tak terpakai (22 komponen semua ada importer); `lib/nav-visibility-store.ts` & `lib/share.ts` live; folder `drizzle/` vestigial tapi sudah didokumentasikan (README peringatan).

### 4. Bug & Edge Case Potensial

| Sev | Lokasi | Temuan | Dampak |
|---|---|---|---|
| P1 | (=WIB metrics, lihat §2) | Tanggal tengah malam WIB di dashboard | KPI salah hari dini hari |
| P2 | `laporan/actions.ts` (baru, `getPembelianBulanan`) | Rentang `-01`..`-31` leksikografis — benar utk teks ISO; `realizedPerKg` sudah dijaga `tonase>0` | Aman; hanya catat sbg WIP belum-deploy |

**Bersih:** null/undefined field replas ditangani (`notaReplasBaris`/`buildKeteranganReplas` coerce angka), nota Thermer wajib ASCII + rata-kanan via align (aturan terdokumentasi), share/keterangan kosong → baris disembunyikan seragam.

### 5. Performa

| Sev | Lokasi | Temuan | Dampak | Arah perbaikan |
|---|---|---|---|---|
| **P1** | `pembelian/actions.ts:402` `getPembelianList`; `penjualan` `getPenjualanList`; `kas` `getKasTransactions`; `biaya/actions.ts:261` `getBiayaList` | **List utama ambil SEMUA baris tanpa limit/paginasi** (pembelian bahkan nested `with` peron+sumberBayar+fotos+details), semua `force-dynamic` hit Turso tiap load | Payload & render membengkak seiring ledger tumbuh; makin lambat tiap bulan | Tambah paginasi/limit + rentang tanggal default (mis. 30–90 hari), atau infinite scroll |
| P2 | `laporan/actions.ts:75` | N+1 (di-`Promise.all`) 1 query saldo-awal per akun kas | Terbatas ~10 akun, dampak rendah | Kolaps ke 1 query grouped |
| P2 | `peron/kesehatan/[id]/share-chart.tsx:5` | `recharts` di-import statis di client chart | Recharts masuk bundle route itu | Bungkus `next/dynamic` (ssr:false) |
| P2 | app-wide (0 `next/image`) mis. `sidebar.tsx:166,300`, foto-bukti | Semua foto/avatar pakai `<img>` mentah | Tak ada resize/lazy/format-nego; muat foto resolusi penuh | Migrasi ke `next/image` bertahap (mulai galeri foto besar) |

**Bersih:** `xlsx` sudah code-split (`laporan-client.tsx:87` dynamic import); `getPeronList` teroptimasi (1 aggregate groupBy, tanpa N+1).

### 6. UI/UX Polish

| Sev | Lokasi | Temuan | Dampak | Arah perbaikan |
|---|---|---|---|---|
| P2 | `components/ui/button.tsx` (default `h-8`=32px, `sm`=28px, `lg`=36px) | `.tap-pad` 44px hanya diterapkan ke varian **icon**, bukan tombol teks | CTA teks di bawah min 44px (WCAG 2.5.5 / HIG) di layar sentuh | Terapkan expander tap-target (pseudo-element) ke tombol teks default juga |

**Bersih (sudah benar, beberapa membalik kekhawatiran lama):** viewport **tanpa** zoom-lock (`layout.tsx:17`); `themeColor` **adaptif** light/dark + `viewportFit:cover` + `env(safe-area-inset-*)` (bottom-nav) + `h-[100dvh]`; skeleton `role="status" aria-busy` (`skeletons.tsx:14`); focus ring global `:focus-visible` (`globals.css:255`, `button.tsx:7`).

### 7. Utang Teknis (tercatat, tak mendesak)

- **Migrasi UI setengah jalan Radix → @base-ui/react.** base-ui sudah menopang `sheet`/`alert-dialog` (7 primitif), tapi 2 primitif terbanyak — `dialog.tsx` (9 importer) & `select.tsx` (12 importer) + `command-palette` — masih Radix. Sisa ~80% pekerjaan migrasi. Dua library = bundle & permukaan maintenance ganda.
- **Folder `drizzle/` vestigial** (SQL basi, bukan sumber kebenaran) — sudah ada README peringatan; bisa dibiarkan.
- **Skrip migrasi build tidak lengkap** vs skrip yang ada (§3) — asumsikan sudah jalan di prod; dokumentasikan agar tak ada yang menjalankan ulang.

---

## Ringkasan Prioritas (tangani lebih dulu)

**Tidak ada P0.** Fondasi keamanan & integritas kas SEHAT (saldo turunan, delete owner-only, secret fail-closed, snapshot histori beku, portal tak bocor, atomic).

**P1 — urut rekomendasi:**

1. **Tarif pajak app_settings tidak ter-wire** (`laporan/actions.ts:251,298`). *Kepercayaan finansial:* owner ubah tarif tapi laporan tetap 11%/22%. Perbaikan kecil (teruskan param yang sudah disiapkan) — **dampak tertinggi, effort terendah.**
2. **List utama tanpa paginasi** (pembelian/penjualan/kas/biaya). *Skalabilitas:* app makin lambat tiap bulan seiring ledger tumbuh — utang yang membesar; sebaiknya dijadwalkan sebelum data makin banyak.
3. **WIB off-by-one di dashboard metrics** (`api/metrics/route.ts:84`). *Akurasi harian:* KPI "hari ini" salah tiap dini hari WIB. Perbaikan 1 baris.
4. **Nav 3 sumber** (`nav-routes` vs sidebar vs bottom-nav). *Maintenance/konsistensi:* risiko nav desync; konsolidasi ke satu sumber.

**P2 tercepat "quick win":** hapus `.env.loca` typo + `react-select` yatim; tambah `logActivity` di `createHargaAcuan`; persempit enum kategori kas manual; satukan konstanta `698917`.

---

*Selesai. Tidak ada perbaikan yang dilakukan — menunggu keputusan pemilik untuk fase berikutnya.*
