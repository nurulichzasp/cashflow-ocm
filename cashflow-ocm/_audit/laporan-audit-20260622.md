# Laporan Audit Menyeluruh (READ-ONLY) — Cashflow OCM

- **HEAD diaudit:** `6edec3114b57cba15ecc86da8f0e92328ca95272` (branch `main`, working tree bersih)
- **Tanggal audit:** 2026-06-22
- **Sifat:** READ-ONLY total — TIDAK ada perubahan kode/DB/migrasi. Hanya file laporan ini yang ditulis.
- **Metode:** 7 sub-agen auditor paralel per area (skill `senior-backend` / `database-designer` / `code-reviewer` / `env-secrets-manager`), lalu **verifikasi ulang langsung dari source HEAD** untuk semua temuan 🔴 dan ⚠️ material (jalur uang & keamanan dibaca sendiri baris demi baris).
- **Legenda:** 🔴 terbukti masalah · ⚠️ perlu konfirmasi / kelemahan laten · ✅ aman

---

## Ringkasan Eksekutif

> **Kabar baik untuk integritas uang:** seluruh jalur normal kas (create / edit / hapus / ganti akun / toggle status bayar) **konsisten dan atomik** — pola `delete-then-reinsert by (refTabel,refId)` dalam satu transaksi, plus rumus saldo tunggal di `lib/saldo.ts`. **Tidak ditemukan drift kas diam-diam pada pemakaian normal.** Temuan 🔴 yang ada bersifat *hardening* / pinggiran, bukan kebocoran uang aktif.

> **UPDATE 22 Jun 2026 — SEMUA TEMUAN SUDAH DIFIX & DEPLOYED** (commit `5358e5a` → omandacerli.com), KECUALI **R4 yang ternyata FALSE ALARM**: verifikasi `PRAGMA table_info` pada DB LIVE menunjukkan kolom uang sudah `integer` (lihat §P2-3). Tabel di bawah = kondisi SAAT audit (HEAD 6edec31), disimpan apa adanya sebagai rekaman.

### 🔴 Terbukti masalah (urut prioritas P0 → P3)

| # | P | Temuan | Lokasi | Severitas praktis |
|---|---|--------|--------|-------------------|
| R1 | P0 | `createTransaksiKas` menerima `refTabel`/`refId` dari FormData tanpa guard → bisa bikin entri kas "auto-palsu" yang nyangkut (tak bisa diedit/hapus via UI) | `kas/actions.ts:41-42, 56-57` | **Rendah** — form normal tak pernah kirim `refTabel`; hanya lewat panggilan server-action langsung |
| R2 | P1 | Mutasi kesehatan/portal peron hanya `requireSession()` (tanpa cek role): **viewer pun bisa** menerbitkan/cabut link portal publik & mengarsip alarm peron | `portal-actions.ts:43-44, 65-66`; `health-actions.ts:73, 90, 116-118` | **Menengah** — bisa lewat tombol UI yang ada; `generatePeronToken` = eksposur data ke luar |
| R3 | P2 | Tanggal setor/bayar pajak pakai UTC `new Date().toISOString()` (bukan WIB) → meleset 1 hari bila ditandai dini hari | `laporan/laporan-client.tsx:399, 438` | **Rendah** — client-side (TZ browser umumnya WIB), hanya jam 00:00–06:59 WIB |
| ~~R4~~ | P2 | ✅ **FALSE ALARM (diverifikasi 22 Jun).** DB live: kolom uang SUDAH `integer` (cocok `schema.ts`). Simpulan "real" diambil dari `0000_woozy_pride.sql` yang BASI — DB dibangun via `db:push`, bukan migration itu. TAK perlu rebuild tabel; tak ada tindakan DB. | DB live `integer` ✓ | — |

### ⚠️ Perlu konfirmasi / kelemahan laten (urut P0 → P3)

| # | P | Temuan | Lokasi |
|---|---|--------|--------|
| W1 | P0 | Pembelian bisa tersimpan `statusBayarPeron='lunas'` **tanpa** `sumberBayarId` → tak ada entri kas keluar (kas terlihat lebih besar dari kenyataan) | `pembelian/actions.ts:163, 288` (schema `:43` `sumberBayarId` optional) |
| W2 | P1 | **Edit** tiket lama me-recompute untung dari `peron.keuntunganPerKg` **live** → snapshot untung historis bisa berubah saat tiket diedit setelah tarif peron diganti | `pembelian/actions.ts:249` (via `computeTotals` `:61`) |
| W3 | P1 | `computeTotals` server **tak meneruskan** `selisihJualBga` per-baris (selalu default 120); form klien menghormatinya → divergensi (dorman, semua data =120) | `pembelian/actions.ts:61` vs `lib/harga.ts:53-58`, `pembelian/actions.ts:434` |
| W4 | P1 | 8 dari 9 subhalaman `/pengaturan` tanpa owner-guard + tak ada `layout.tsx` → non-owner yang mengetik URL bisa **membaca** (tarif pajak, data perusahaan, cadangan). **Tulis tetap owner-only** (tak ada write-bypass) | `pengaturan/{pajak,perusahaan,cadangan,notifikasi,printer,tampilan,harga,tentang}/page.tsx` |
| W5 | P1 | `BETTER_AUTH_SECRET` dibaca tanpa guard fail-closed → bila env lupa di-set, better-auth diam-diam pakai secret default publik (cookie bisa dipalsu) | `lib/auth.ts:39` |
| W6 | P1 | `/api/notify` hanya cek session (tanpa role) → user login mana pun bisa memicu pesan Telegram dgn payload arbitrer (spam/inject) | `app/api/notify/route.ts:6-25` |
| W7 | P1 | `proxy.ts` pakai `startsWith` (prefix string, bukan segmen) → rapuh untuk rute masa depan (mis. `/loginhelp` jadi publik). **Tak ada kebocoran nyata sekarang** | `proxy.ts:30` |
| W8 | P1 | `/api/foto` whitelist seluruh wildcard `*.blob.vercel-storage.com` (anti-SSRF cukup, bisa lebih ketat) | `app/api/foto/route.ts:14-22` |
| W9 | P2 | FK enforcement Turso/libSQL (`PRAGMA foreign_keys=ON`) belum dipastikan aktif → kolom non-cascade (`transaksi_kas.akunId`, dst) bisa menggantung saat hapus peron/akun | `lib/db/*` (perlu cek koneksi) |
| W10 | P2 | Validasi uang Zod tanpa `.int()` → rupiah pecahan bisa lolos ke kolom integer | `kas/biaya/peron/penjualan/pembelian actions` + `harga/actions.ts:28` |
| W11 | P2 | Lookup harga acuan default pakai UTC (server Vercel) | `pembelian/actions.ts:406`, `harga/actions.ts:108` |
| W12 | P2 | Snapshot/kesehatan peron tak rebuild saat hapus pembelian (basi sementara sampai cron) | `pembelian/actions.ts:334-375` |
| W13 | P3 | 2 warna `red-` mentah (bypass token `--crit`): error login `text-red-300` (terlihat user) + dot notif `bg-red-500` (belum di-wire) | `app/(auth)/login/page.tsx:134`; `components/bottom-nav.tsx:64` |
| W14 | P3 | Dua sumber nav terduplikasi (`lib/nav-routes.ts` vs `components/sidebar.tsx`) — **isi sinkron**, tapi rawan drift | `components/sidebar.tsx:29-40` |
| W15 | P3 | Utang teknis: dua pustaka primitif (`@base-ui` + `@radix-ui`) hidup berdampingan (overlap Dialog) | `components/ui/{sheet,dialog,select}.tsx`, `command-palette.tsx` |
| W16 | P3 | `tsc --noEmit` lokal EXIT 1 karena artefak duplikat `.next/...` " 2" (iCloud sync). **Source 0 error & `.next` gitignored** → produksi aman | `.next/types/* 2.ts` (lokal saja) |

**Tidak ada temuan 🔴 pada:** rumus saldo, idempotency, cascade foto/detail, konsistensi nota (4 mode), timing-safe & fail-closed di endpoint mesin (backup/cron/telegram/peron-health), magic-byte upload, tidak ada secret ter-commit.

---

## P0 — Integritas Kas

### ✅ 1. Edit induk → kas anak ter-update (bukan dobel)
- **Bukti:** `pembelian/actions.ts:287-305` (dalam `db.transaction`: `tx.delete(transaksiKas).where(and(eq(refTabel,'pembelian'), eq(refId,id)))` lalu insert ulang bila lunas); pola sama `penjualan/actions.ts:232-249`, `biaya/actions.ts:191-203`.
- **Temuan:** Semua modul "delete-then-reinsert" by `(refTabel,refId)` dalam satu transaksi atomik. Tak ada entri baru tanpa hapus lama → tak ada dobel hitung.
- **Rekomendasi:** Tidak ada.

### ✅ 2. Hapus induk → kas anak terbalik
- **Bukti:** `pembelian/actions.ts:349-352` (`tx.delete(transaksiKas)...` lalu `tx.delete(pembelian)`); idem `penjualan:273-276`, `biaya:235-238`, `peron:231-235` (modal_peron).
- **Temuan:** Pembalikan kas manual di tiap action, atomik. Tak ada jalur hapus yang melewatkannya.
- **Catatan arsitektur (⚠️ ringan, bukan bug):** `refTabel/refId` (`schema.ts:230-231`) hanya kolom `text` biasa — **bukan FK**, jadi tak ada cascade DB untuk kas auto. Pembalikan 100% bergantung kode manual. Rapuh bila kelak ada jalur hapus induk baru yang lupa membuang kas. **Rekomendasi:** tambahkan test "hapus induk → 0 baris kas dgn refId tsb" sebagai pengaman; tak perlu ubah skema.

### ✅ 3. Ganti akun sumber bayar saat edit
- **Bukti:** `pembelian/actions.ts:287` delete kas lama by `(refTabel,refId)` **tanpa** filter akun, lalu `:290-304` insert ke `akunId: sumberBayarId` baru. Idem `biaya:191`.
- **Temuan:** Akun A→B: entri di A terhapus, entri baru di B. Saldo A pulih, B berkurang. Tak ada saldo nyangkut. (Penjualan selalu `getAkunUtama()` → tak ada skenario ganti akun.)
- **Rekomendasi:** Tidak ada.

### ✅ 4. Rekonsiliasi / rumus Total Kas
- **Bukti:** `lib/saldo.ts:10-11,19-27` — `saldo = saldoAwal + Σ(masuk) − Σ(keluar)`, satu helper dipakai konsisten di `kas/page.tsx`, `dashboard/page.tsx`, `api/metrics`, `telegram-snapshots.ts`, `laporan/actions.ts`. Subtotal dibulatkan saat sumber (`pembelian/actions.ts:67-68` `Math.round`) → tak ada akumulasi sen.
- **Temuan:** Satu rumus invariant, tak ada penjumlahan ganda / arah terbalik.
- **Rekomendasi:** Tidak ada.

### ⚠️ 5. Edge status bayar — lunas tanpa sumber bayar  → **[W1]**
- **Bukti:** `pembelian/actions.ts:163` `if (parsed.statusBayarPeron === 'lunas' && parsed.sumberBayarId)` (idem `:288`); schema `:43` `sumberBayarId: z.string().optional()`.
- **Temuan:** Toggle `belum↔lunas` benar dua arah (selalu hapus lama dulu). **Tapi** bila ditandai `lunas` **tanpa** memilih `sumberBayarId`, induk tersimpan `lunas` **tanpa** entri kas keluar → kas terlihat lebih besar dari kenyataan. `peron/actions.ts:157-161` memaksa akun untuk modal/DP, tapi pembelian lunas tak punya paksaan setara di server.
- **Rekomendasi:** Guard server tolak `statusBayarPeron==='lunas' && !sumberBayarId` di `createPembelian`/`updatePembelian` (mirror pola peron). Risiko rendah, ~4 baris. Verifikasi dulu validasi klien (`pembelian-form-dialog.tsx`) untuk menilai apakah ini sudah tertutup di UI.

### 🔴 6. Entri kas AUTO diblokir dari edit/hapus manual — bocor di CREATE  → **[R1]**
- **Bukti:** Blokir benar di `updateTransaksiKas` (`kas/actions.ts:103`) & `deleteTransaksiKas` (`:147`) — `if (existing.refTabel) throw`. **Lubang:** `createTransaksiKas` menerima `refTabel`/`refId` dari FormData mentah (`kasSchema` `:41-42`, parse `:56-57`) **tanpa validasi**.
- **Temuan:** Entri kas manual bisa dibuat dengan `refTabel='pembelian'` + `refId` apa pun (lewat panggilan server-action langsung). Akibat: entri "auto-palsu" yang **tak bisa diedit/dihapus** via UI (karena guard refTabel) → drift permanen yang sulit dibersihkan; berpotensi dobel-offset satu induk karena `idempotencyKey` tak diset untuk entri manual.
- **Severitas praktis: RENDAH.** Diverifikasi: **form normal tak pernah mengirim `refTabel`** (grep — `kas-table.tsx:51,124` hanya *membaca* `item.refTabel` untuk `canEdit`). Jadi hanya tereksploitasi via direct server-action call / bug klien.
- **Rekomendasi:** Strip/tolak `refTabel` & `refId` dari `kasSchema` manual (`:41-42`) dan pemetaan `:56-57`, sehingga field itu tak pernah berasal dari FormData. Defense-in-depth, 1 fungsi + skema.

---

## P1 — Korektness Harga / Margin

### ⚠️ 1. `lib/harga.ts` satu sumber + magic number  → **[W3]**
- **Bukti:** `lib/harga.ts:20` `SELISIH_JUAL_BGA=120`, `:23` `CAP_KEUNTUNGAN_PERON=50`, clamp tunggal `:40-47`. Konsumen impor dari `@/lib/harga` (`pembelian/actions.ts:13`, form dialog). **Literal `120` bocor** (bukan konstanta) di `harga/actions.ts:29,40,81`, `seed.ts:63,70`, `schema.ts:101` — nilainya benar, tapi duplikat sumber. **Divergensi laten:** `computeTotals` memanggil `effectiveKeuntunganPerKg(keuntunganPerKg, isTBS)` (`pembelian/actions.ts:61`) **tanpa** arg ke-3 `selisihJualBga` → server selalu pakai 120, sedangkan form klien meneruskan `a.selisihJualBga` dan `getHargaAcuanListForProduk` (`:434`) memang mengembalikannya.
- **Temuan:** `harga.ts` = satu sumber rumus (tak ada rumus tandingan). Divergensi **dorman** karena semua baris acuan dipaksa `selisihJualBga=120`; menjadi nyata hanya bila kelak ada baris ≠120 (preview form ≠ nilai tersimpan server).
- **Rekomendasi:** (a) Ganti literal `120` agar mereferensikan `SELISIH_JUAL_BGA`. (b) Teruskan `selisihJualBga` per-baris ke `computeTotals`/`effectiveKeuntunganPerKg` agar server konsisten dgn klien. Risiko sedang (mengubah perhitungan persist) — pastikan tetap 120 untuk data eksisting.

### ✅ 2. Aturan cap brondolan / TBS bebas / "Umum"=30
- **Bukti:** Cap & TBS di `harga.ts:46` (`isTBS ? raw : Math.min(raw, CAP)`); server via `effectiveKeuntunganPerKg` + `isKategoriTBS` (`actions.ts:61,104,249`). "Umum" = satu peron `keuntunganPerKg=90` (`scripts/set-umum-kelebihan-30.ts`, `seed-peron.ts:41`), bukan kategori. Cap tak bisa di-bypass dari form (selalu lewat derive).
- **Temuan:** Konsisten antara `lib/harga.ts`, server actions, dan form.
- **Catatan ⚠️:** `peron/actions.ts:34` `keuntunganPerKg` hanya `.min(0)` tanpa batas atas → nilai >120 bikin kelebihan peron negatif (tak melanggar aturan, tapi tak ada guard salah-ketik ekstrem). Pertimbangkan `.max(SELISIH_JUAL_BGA)`.

### ⚠️ 3. Historis ditulis ulang saat edit  → **[W2]**
- **Bukti:** Tampil/laporan/portal **murni baca snapshot** tersimpan (`pembelian-table.tsx`, `invoice-print.tsx`, `laporan/actions.ts:108-117`, `app/p/[token]/page.tsx:142`) — **✅ aman**. **Tapi** `updatePembelian` memanggil `computeTotals(parsed.details, peronData.keuntunganPerKg, ...)` dengan tarif **terkini** (`pembelian/actions.ts:249`). `hargaBeli`/`hargaLapangan` aman (dari detail tersimpan), namun `totalJual`/`keuntungan`/`subtotalJual` **dihitung ulang dgn `keuntunganPerKg` peron saat ini**.
- **Temuan:** Jika `keuntunganPerKg` peron berubah setelah tiket dibuat, lalu tiket lama diedit (bahkan hanya ubah catatan/foto), kolom untung/jual tiket itu **ikut berubah** ke tarif baru — snapshot untung tidak terkunci terhadap edit.
- **Rekomendasi:** Simpan `keuntunganPerKg`/`selisihJualBga` snapshot di baris pembelian saat transaksi, lalu `updatePembelian` pakai nilai tersimpan (kecuali user sengaja ganti peron). Butuh keputusan domain: edit tiket lama harus ikut tarif lama (snapshot) atau tarif terkini? Risiko sedang (kolom baru + migrasi).

---

## P1 — Gating Hapus & RBAC

> **Catatan arsitektur:** RBAC server = **role-based** (`lib/permissions.ts` matrix + `requireOwner`). `user.permissions` JSON per-modul HANYA dipakai untuk **visibilitas nav**, tak pernah dibaca server action.

### ⚠️ 1. Peta fungsi delete — konsisten owner-only; bug `canDelete` lama SUDAH difix
| Fungsi | Lokasi | Gate |
|--------|--------|------|
| `deleteTransaksiKas` | `kas/actions.ts:140-141` | `requireOwner()` |
| `deletePembelian` | `pembelian/actions.ts:334-337` | `requireOwner()` (komentar: diseragamkan 15 Jun, dulu `canDelete`) |
| `deletePenjualan` | `penjualan/actions.ts:268-269` | `requireOwner()` |
| `deleteBiayaOperasional` | `biaya/actions.ts:228-231` | `requireOwner()` (idem komentar) |
| `deleteHargaAcuan` | `harga/actions.ts:122-123` | `requireOwner()` |
| `deletePeron` / `deleteModalPeron` | `peron/actions.ts:116-117 / 226-227` | `requireOwner()` |
| `deleteUser` | `pengaturan/actions.ts:108-110` | inline `role!=='owner'` + anti self-delete |
| `archivePeron` (soft-delete dari alarm) | `health-actions.ts:116-118` | **`requireSession()` saja** 🔴 |
| `revokePeronToken` (putus portal) | `portal-actions.ts:65-67` | **`requireSession()` saja** 🔴 |

- **Temuan:** Inkonsistensi yang dicurigai (`deletePembelian`/`deleteBiaya` pakai `canDelete` longgar) **sudah tidak ada di HEAD** — semua delete data keuangan/master kini owner-only & konsisten (pengetatan yang benar). Sisa masalah ada di aksi destruktif "tersembunyi" → lihat poin 2.

### 🔴 2. Coverage gate — mutasi tanpa gate otorisasi  → **[R2]**
- **Bukti:** Fail-closed ✅ (`permissions.ts:69-70` role tak dikenal → `noPermissions`; default user `viewer`, `auth.ts:57`). Semua create/edit modul inti ber-`requirePermission` ✅. **Tapi** mutasi berikut hanya `requireSession()`:
  - `createFollowup` `health-actions.ts:89-100` (insert + arsip bila outcome `hilang` `:109-111`)
  - `archivePeron` `health-actions.ts:116-118` (update `isArchived=true`)
  - `refreshPeronHealth` `health-actions.ts:73-75` (rebuild tabel kesehatan)
  - `generatePeronToken` `portal-actions.ts:43-52` (mint token portal publik, `randomBytes(32)`)
  - `revokePeronToken` `portal-actions.ts:65-67` (matikan link portal)
- **Temuan:** Lima mutasi ini bisa dipicu **role apa pun yang login** (termasuk `viewer`/`akuntan`). Dampak: (1) viewer mengarsip peron → menyembunyikan masalah supplier dari alarm; (2) **`generatePeronToken` = viewer bisa menerbitkan URL `/p/<token>` read-only** yang membuka data peron ke pihak luar tanpa login (jalur publik dikonfirmasi `proxy.ts:22`). Ini eksposur data eksternal oleh role read-only → layak 🔴.
- **Rekomendasi:** Naikkan gate sesuai sensitivitas — minimal `requirePermission(...,'canEdit')`; `generatePeronToken`/`revokePeronToken` pertimbangkan `requireOwner`. Putuskan eksplisit apakah `createFollowup` memang sengaja longgar. Selaraskan juga tombol klien (`archive-button.tsx`, `portal-link-card.tsx`, dll) agar tersembunyi untuk non-owner.

### ⚠️ 3. Nav visibility & guard `/pengaturan`  → **[W4]**
- **Bukti:** Nav ikut JSON per-modul untuk `pembelian/penjualan/kas/biaya` (`nav-routes.ts:107-114`) ✅ (kosmetik). `/pengaturan` `ownerOnly:true` di nav (`nav-routes.ts:48`) & disembunyikan di sidebar ✅. **Tapi** proteksi rute aktual: `proxy.ts` hanya cek **ada-tidaknya** cookie (tak cek role); `pengaturan/page.tsx:15` cuma `getSettingsGroups(isOwner)` (kosmetik); hanya `pengguna/page.tsx` yang `redirect` non-owner. **8 subpage tanpa owner-guard** & **tak ada `layout.tsx`**: `pajak, perusahaan, cadangan, notifikasi, printer, tampilan, harga, tentang`.
- **Temuan:** Non-owner yang mengetik URL langsung (mis. `/pengaturan/pajak`) **tetap me-render** & membaca data (tarif pajak, data perusahaan, cadangan) via read-action session-only. **Tulis pengaturan tetap owner-only di server** (`setAppSettings:361-365`, dll) → **tidak ada write-bypass**, hanya read-exposure + UX bocor (form admin tampil padahal submit ditolak).
- **Rekomendasi:** Tambah `app/(dashboard)/pengaturan/layout.tsx` dengan satu `redirect('/dashboard')` bila bukan owner (lindungi seluruh subtree sekaligus). Whitelist eksplisit bila ada subpage yang sengaja boleh non-owner. Risiko rendah, 1 file.

---

## P1 — Auth & Keamanan API + Higiene Env

### ✅ proxy.ts — mekanisme & portal `/p/`
- `proxy.ts:30-40` cek **keberadaan** cookie session (validasi sesungguhnya di tiap page/route via `getSession` — benar untuk edge proxy). `'/'` exact-match (`:28-29`). Portal `'/p/'` **dengan trailing slash** (`:22-23`, komentar sadar: tanpa slash akan cocok `/peron`,`/penjualan`). Matcher tak mengecualikan `/api` → API ikut ter-gate cookie (defense-in-depth). Path-traversal `/p/../admin` **tidak** bypass (pathname ter-normalisasi). 
### ⚠️ proxy.ts — `startsWith` terlalu longgar  → **[W7]**
- **Bukti:** `proxy.ts:30` `publicPaths.some((p)=>pathname.startsWith(p))`. **Temuan:** cocok per-substring-awal, bukan per-segmen → `/loginhelp`, `/api/cronjobs` akan jadi publik. Diverifikasi **tak ada rute nyata yang bertabrakan sekarang**, tapi rapuh untuk rute masa depan. **Rekomendasi:** `pathname===p || pathname.startsWith(p+'/')`. Risiko rendah, 1 file.

### Gating per API route
| Route | Status | Catatan |
|-------|--------|---------|
| `/api/backup` (POST) | ✅ | `timingSafeEqual` + cek length, `BACKUP_TOKEN` fail-closed (`route.ts:84-90`), token via header Bearer. GET owner-only. |
| `/api/cron/daily-summary` | ✅ | Bearer `CRON_SECRET` timing-safe, fail-closed di SEMUA env (`:39-47`). |
| `/api/peron-health/refresh` | ✅ | `CRON_SECRET` timing-safe, fail-closed (`:8-29`). |
| `/api/telegram/webhook` | ✅ | Secret header/`?secret` timing-safe (`:90-100`) + whitelist chat id (`:118-125`). |
| `/api/upload-foto` | ✅ | Magic-bytes nyata (`detectImageType` `:12-39`), MAX 8MB, session, pakai ext/mime hasil deteksi (bukan input klien). |
| `/api/health` (POST) | ✅ | Owner-only + wajib body `{confirm:'HAPUS-SEMUA-DATA'}` (`:56-80`), GET diagnostik redact URL Turso. |
| `/api/metrics` | ✅ | Session + `hasPermission(role,'canViewFinance')` (`:19-28`). |
| `/api/parse-bast` | ✅ | `if(!session) 401` (`:8-9`). Catatan teknis: parser tanpa batas ukuran eksplisit (andalkan limit body Vercel). |
| `/api/foto` | ⚠️ **[W8]** | Whitelist host via `endsWith('.blob.vercel-storage.com')` (`:14-22`) — anti-SSRF cukup; bisa di-pin ke host store spesifik. |
| `/api/notify` | ⚠️ **[W6]** | Hanya `if(!session) 401` tanpa cek role (`:6-25`) → user login mana pun bisa kirim Telegram payload arbitrer. **Rekomendasi:** batasi ke role pembuat transaksi + validasi bentuk `data`. |
| `/api/client-error` | ✅ | Sengaja publik (dipanggil saat sesi rusak), length-capped, tak sentuh DB. Catatan: tanpa rate-limit (DoS log ringan). |
| `/api/auth/[...all]` | ✅ | Delegasi penuh ke better-auth. |

### ⚠️ Auth config & env  → **[W5]**
- **Bukti:** `lib/auth.ts:39` `secret: process.env.BETTER_AUTH_SECRET` **tanpa guard** — better-auth fallback ke literal default publik bila kosong (hanya `warn`, tak throw). **Temuan:** bila env lupa di-set di suatu environment, cookie session bisa dipalsu. Ter-mitigasi karena prod menyetel env. **Rekomendasi:** fail-closed di `lib/auth.ts` (throw bila `!BETTER_AUTH_SECRET` di production). 1 file.
- **✅ Aman:** `disableSignUp:true` (`:48`), default role `viewer` + `input:false` (`:56-58`, tak bisa inject role), `trustedOrigins` dari env (`:16-26`), `cookieCache.maxAge:60` (pencabutan sesi cepat).
- **✅ Higiene env:** `git ls-files` hanya track `.env.example` (placeholder); `.gitignore:33-41` pola `.env*` + `!.env.example` + sabuk pengaman `*RAHASIA*`/`*.secret.md`/`*.pem`. Tak ada secret asli ter-commit (grep token bersih kecuali hash `package-lock.json`). Pembacaan `CRON_SECRET`/`BACKUP_TOKEN`/`TELEGRAM_WEBHOOK_SECRET` semua **fail-closed**. *(Catatan lokal: ada `.env.loca` typo di disk — di luar git, sebaiknya dihapus agar tak membingungkan.)*

---

## P2 — Integritas Data & Skema + Tanggal/WIB

### ✅ 1. Idempotency
- **Bukti:** `uniqueIndex` `idempotencyKey` di 5 tabel (`schema.ts:90-93,130-133,165-168,190-193,235-238`); terpasang di DB via `drizzle/0003` + `scripts/add-idempotency-columns.ts` (`CREATE UNIQUE INDEX IF NOT EXISTS`). Form kirim key deterministik (`crypto.randomUUID()` di-reset hanya setelah sukses) di kelima dialog; action pakai `.onConflictDoNothing(...).returning()` + tolak bila kosong. Entri kas turunan dikunci `pembelian:${id}` dst.
- **Temuan:** Lengkap & benar (kolom + index + pengisian + race-proof). **Rekomendasi:** Tidak ada.

### ✅ 2. Cascade & Orphan
- **Bukti:** Keempat relasi anak punya `onDelete:'cascade'`: `pembelian_detail:139`, `penjualan_detail:173`, `pembelian_foto:198`, `biaya_foto:206`. Hapus induk atomik + buang kas turunan dulu. `peron_*` cascade dari `peron`.
- **⚠️ Catatan W9 (FK enforcement):** cascade hanya jalan bila `PRAGMA foreign_keys=ON` per koneksi — belum dipastikan di `lib/db`. Bila OFF, kolom non-cascade (`transaksi_kas.akunId`, `biaya.akunSumberId`, `pembelian.sumberBayarId/peronId`) tak memblok hapus induk → referensi menggantung (hanya bahaya saat hapus peron/akun). **⚠️ Catatan W12:** hapus pembelian tak rebuild `peron_snapshot/health` → data kesehatan basi sementara. **Rekomendasi:** pastikan `foreign_keys=ON` / guard "tolak hapus peron-akun yang masih direferensikan"; panggil rebuild kesehatan setelah `deletePembelian` bila perlu instan.

### ✅ 3. Konsistensi tipe — [R4] FALSE ALARM (diverifikasi) + [W10] `.int()` (DIFIX)
- **✅ UPDATE 22 Jun (pasca-verifikasi `PRAGMA table_info` DB LIVE):** SEMUA kolom uang sudah **`integer`** — `pembelian` (harga_jual/harga_beli/total_jual/total_beli/keuntungan/keuntungan_per_kg), `pembelian_detail` (harga_lapangan/subtotal_beli/subtotal_jual/keuntungan), `penjualan` (total_nilai/total_bersih), `biaya_operasional.jumlah`, `transaksi_kas.jumlah`, `modal_peron.jumlah`, `harga_acuan` (harga_lapangan/selisih_jual_bga), `akun_kas.saldo_awal`; `tonase`/`qty_kg` benar `real`. **Tidak ada drift di DB** — `schema.ts` SUDAH cocok. R4 false alarm: DB dibangun via `db:push` (bukan `0000_woozy_pride.sql` yang basi). **TAK ada & TAK perlu rebuild tabel keuangan.**
- **Klaim asli (kini terbantah):** `0000_woozy_pride.sql` menulis kolom uang `real`, tapi file itu **BASI** dan bukan cermin DB live (drizzle `_journal` inkonsisten: 2 entri vs 4 file SQL → workflow nyata = hand-script `add-*.ts` + `db:push`, bukan `drizzle-kit migrate`). Lihat `drizzle/README.md` (ditambah utk cegah alarm palsu berulang).
- **W10 (DIFIX & DEPLOYED):** validasi uang kini `.int()`/`Math.round` (`kas/biaya/peron/penjualan/harga`), cegah pecahan rupiah.

### 🔴 4. Tanggal / WIB  → **[R3]** + ⚠️ lookup UTC **[W11]**
- **Bukti (🔴 R3):** `laporan/laporan-client.tsx:399` & `:438` — `const tgl = next==='sudah' ? new Date().toISOString().slice(0,10) : undefined` → disimpan sebagai `tanggalSetor`/`tanggalBayar` (`pengaturan/actions.ts:276,291`). `toISOString()` = UTC. Menandai PPN/PPh "Sudah" jam 00:00–06:59 WIB menyimpan tanggal kemarin. (Client-side → TZ browser, umumnya WIB, jadi frekuensi rendah.)
- **Bukti (⚠️ W11):** `pembelian/actions.ts:406` (`getLatestHargaAcuan`) & `harga/actions.ts:108` — `targetDate = tanggal || new Date().toISOString().slice(0,10)` (server Vercel UTC) → dini hari WIB bisa ambil harga acuan kemarin.
- **✅ Aman:** semua form transaksi default tanggal via `todayString()`/`jakartaDateString()` (`lib/format.ts:63-70`); `new Date()` lain hanya timestamp/dedup/display. `lib/peron-health/week.ts:13` offset tetap +7 = benar (WIB tanpa DST).
- **Rekomendasi:** Ganti `new Date().toISOString().slice(0,10)` → `todayString()` (`@/lib/format`) di keempat lokasi. Risiko sangat rendah.

---

## P2 — Nota (konsistensi keterangan replas)

### ✅ Satu sumber di 4 mode + fix 6edec31 seragam + edge case ter-test
- **Bukti:** Semua builder di `app/(dashboard)/pembelian/invoice-print.tsx`; tak ada builder nota lain (grep bersih). Keempat mode memanggil `notaKeteranganReplas(...)` (`:87` A5, `:221` thermal preview, `:369` gambar, `:683` Thermer) + `formatRentangKotak(...)` per-baris (`:95,327,391,708`). Helper tunggal `lib/format.ts:191-199`/`:167-175`; ringkasan `:174` `Total ${n} Replas` tanpa rentang; form preview pakai helper sama. Data lama ber-rentang ternormalisasi via regex `isAutoKeteranganReplas` (`:178-180`). Edge case (N=0/1, rentang null, overflow) ter-guard & ber-test (`lib/__tests__/format.test.ts`, 40+ assert).
- **Temuan:** Konsisten penuh; tak ada builder kedua / format lama yang nyelip.
- **Rekomendasi (kosmetik):** `formatRentangReplas()` (`lib/format.ts:123-131`) kini **dead code** (hanya dipakai test) — aman dihapus bila ingin merapikan.

---

## P3 — Konsistensi UI / Token & Build / Utang Teknis

### ✅ 1. Amber/orange mentah = NOL
- **Bukti:** Semua hit `amber-/orange-/#f59e/...` ada di `app/globals.css:297-449` (layer override yang justru me-*remap* ke netral/token); satu-satunya hit komponen = komentar `status-pill.tsx:11`. Tak ada kelas/hex amber/orange sebagai styling di `.tsx`.

### ⚠️ 2. Warna fungsional via token — 2 bocoran `red-`  → **[W13]**
- **Bukti:** Sistem token solid (`globals.css:121-123,158-160` `--ok/--warn/--crit`; `StatusPill`/`StatusDotLabel` dipakai luas; tak ada `green-/emerald-/yellow-` mentah di TSX). **Bocoran:** `app/(auth)/login/page.tsx:134` `text-red-300` (latar gelap login bukan `.dark` → tak ternormalisasi globals.css → render merah mentah, terlihat user); `components/bottom-nav.tsx:64` `bg-red-500` (dot notif, **belum di-wire** → inert).
- **Rekomendasi:** `text-red-300` → `text-crit`/`var(--crit-fg)` (1 baris); dot notif ganti token saat di-wire. P3 kosmetik.

### ⚠️ 3. Dua sumber nav  → **[W14]**
- **Bukti:** `lib/nav-routes.ts` `APP_ROUTES` (palette/shortcut) vs `components/sidebar.tsx:29-40` `navItems` hardcoded (desktop). **Isi sinkron** (10 rute sama), tapi logika filter `ownerOnly/perm` digandakan → rawan drift bila rute ditambah di satu tempat. **Rekomendasi:** sidebar konsumsi `APP_ROUTES`/`visibleRoutes()`. Tak mendesak.

### ✅ 4. RowActionMenu di semua daftar
- **Bukti:** Dipakai di keenam modul (`pembelian/penjualan/kas/biaya/peron/harga`-table.tsx). Pola kebab seragam, destruktif via `AlertDialog` owner-only.

### ⚠️ 5. `tsc --noEmit` & `ignoreBuildErrors`  → **[W16]**
- **Bukti:** `next.config.ts:14` `ignoreBuildErrors:false` ✅. `npx tsc --noEmit` EXIT 1 — **tapi** 2 error berasal dari artefak duplikat `.next/types/* 2.ts` (sufiks " 2" dari iCloud/Finder sync), bukan source. **Source 0 error**; `.next` gitignored → produksi/Vercel aman. **Vitest: 68 pass / 5 file hijau.** **Rekomendasi:** hapus `.next/` lokal & rebuild; keluarkan folder repo dari sinkronisasi iCloud (path di `~/Documents`); tambah script `"typecheck"`.

### ✅ 6. Skrip migrasi idempotent
- **Bukti:** `package.json:17` `vercel-build` jalankan 3 script sebelum `next build`: `add-replas-fields` & `add-biaya-kategori-lain` (pola `hasColumn()` via `PRAGMA` lalu `ADD COLUMN` bila belum ada), `add-app-settings-table` (`CREATE TABLE IF NOT EXISTS`). Aman dijalankan ulang. Script `add-*` lain manual (tak di build).

### 🔴/⚠️ 7. Dead code & dual-library (catat saja)  → **[W15]**
- **Bukti:** Checkbox (`ui/checkbox.tsx`, `ui/origin/checkbox.tsx`) **sudah tidak ada di HEAD** (premis audit usang — tak perlu aksi). **Dual-library terkonfirmasi:** `@base-ui/react` dipakai 7 file, `@radix-ui` (dialog+select) 3 file; **overlap Dialog** (`sheet.tsx` base-ui vs `dialog.tsx`/`command-palette.tsx` radix). Utang teknis (bundle + a11y konsistensi). **Rekomendasi (jangan implement):** standardkan ke base-ui; migrasi `dialog.tsx`/`select.tsx`/`command-palette.tsx`, uji manual semua modal. Risiko sedang–tinggi (konsisten dgn memory: "migrasi Radix→base-ui sengaja di-skip").

---

## Penutup

- Audit **READ-ONLY** — tidak ada perubahan kode/DB/migrasi; nilai secret tidak pernah ditampilkan.
- **`snapshot-app.md` TIDAK diregenerasi** (belum ada perubahan kode).
- Perbaikan dilakukan **per item lewat spec terpisah** setelah Ichza pilih prioritas. Saran urutan: **R2** (gate portal/health — keamanan, mudah & berdampak), lalu **W1 & W4** (lunas-tanpa-sumber + guard /pengaturan), lalu **R1/R3/R4** (hardening) dan **W2/W3** (keputusan domain snapshot harga).
