# 🔍 Audit Visual — Fase 1 (Read-Only)

**Repo:** `nurulichzasp/cashflow-ocm` · **HEAD:** `42b01b5` · **Tanggal:** 2026-06-18
**Sifat:** AUDIT SAJA. **Nol perubahan kode.** Laporan ini deliverable Fase 1. Fix menunggu approval.

> **Cara baca cepat:** sistem desainnya **sangat bersih** — token, catch-all, dan komponen
> berbagi (`surface`, `StatusPill`, `RowActionMenu`, `EmptyState`, `.num`) sudah matang.
> Temuan nyata terpusat di **5 titik**: (1) regresi kontras `dark:text-[#6B7280]`, (2) kosakata
> hijau/merah ganda (`text-masuk/keluar` vs `--ok/--crit`), (3) motion 4 overlay tidak seragam
> (100/200/300ms), (4) kartu Pembelian/Penjualan tak pakai `.surface`, (5) hex mentah louder di
> layar Kesehatan Peron. Sisanya kosmetik atau pengecualian sah.

---

## 0. Ringkasan skor & status guardrail

| Kategori | Status | Temuan utama |
|---|---|---|
| 1A Warna mentah | 🟢 Sangat bersih | 1 raw class (notif dot, disengaja); hex terklasifikasi; 1 regresi kontras |
| 1B Spacing & ritme | 🟢 Bersih | spacing skala patuh; type-scale terfragmentasi; kartu 3 divergensi |
| 1C Komponen & motion | 🟡 Perlu seragam | 4 overlay beda durasi/easing/scrim; 2 library (deferred) |
| 1D Kontras WCAG | 🟡 5 gagal | inti semua lulus; gagal di vocab hijau/merah + label #6B7280 |
| 1E State coverage | 🟢 Baik | loading lengkap (1 nuansa); EmptyState 7/12; tak ada dead component |

**Guardrail — nol pelanggaran.** Tidak ada baris kode diubah/ditambah/dihapus. Tidak ada
`drizzle-kit push/migrate`. Logika data/uang tidak disentuh. Skrip hitung WCAG ditulis ke
`/tmp` (di luar repo), bukan ke kode. Semua item guardrail diperlakukan sebagai keputusan final
(detail di §7).

---

## 1. RUBRIK — 14 layar

**Skala 0–2 per pilar:** `0` = gagal · `1` = lewat · `2` = teladan.
Aturan tabrakan: Premium > Minimalist > Compact.
Catatan: skor yang bergantung ukuran runtime (tinggi hero, jumlah kartu above-fold) ditandai
`†` dan **harus dikonfirmasi lewat checklist 1F (§6)** — laporan ini menilai dari kode.

| Layar | Min | Com | Prem | Catatan (file:baris) |
|---|:--:|:--:|:--:|---|
| **Beranda** (dashboard) | 1 | 1† | 2 | 4 aksi + carousel + hero → bukan "1 aksi primer" murni (by design pusat kendali). Tinggi hero & ≥4 kartu above-fold = cek 1F. Token & `.num` rapi. |
| **Pembelian** | 2 | 1 | 1 | Kartu pakai border inline, **bukan `.surface`** (`pembelian-table.tsx:399`). Label `dark:text-[#6B7280]` gagal kontras (`:240`). RowActionMenu+dot konsisten. |
| **Penjualan** | 2 | 1 | 1 | Sama pola Pembelian: border inline (`penjualan-table.tsx:372`) + `dark:text-[#6B7280]` (`:142`). |
| **Buku Kas** | 2 | 2 | 1 | `.surface` ✓, 3 zona padat ✓. Tapi `ArahIndicator` pakai hijau/merah **terang** (`#16A34A`/`#DC2626`) yang gagal kontras (lihat 1D) & beda dari `--ok/--crit`. |
| **Biaya** | 2 | 2 | 2 | Bersih. `.surface`, RowActionMenu, EmptyState, `.num`, nol warna status. Acuan "keluarga kartu". |
| **Laporan** | 1 | 1 | 1 | Empty & skeleton **bikin sendiri** (border-dashed `laporan-client.tsx:59`), bukan `EmptyState`. Tabel pakai token (rapi). Padat. |
| **Harga** | 2 | 2 | 2 | Bersih. `.surface`, grid harga `.num`, `ProdukBadge`, EmptyState. |
| **Peron (list)** | 2 | 2 | 1 | `.surface` + **`press-card`** (satu-satunya modul; `peron-table.tsx:176`) → ritme tap beda dari kartu lain. StatusPill konsisten. |
| **Peron (detail)** | 1 | 1 | 1 | `modal-history-table.tsx:81` hijau/merah terang (gagal kontras); empty ad-hoc (`:58`); `portal-link-card.tsx:80,106` hex `#B45309/#DC2626`. |
| **Kesehatan Peron** | 1 | 1 | 1 | Hex mentah **lebih terang** dari token (`page.tsx:86,90` `#DC2626/#B45309/#F87171/#FBBF24`) → keluar dari bahasa `--crit/--warn`. Empty ad-hoc (`:114`). Loading = fallback skeleton list peron (mismatch). |
| **Profil** | 1 | 1 | 1 | Full-screen, grup di-filter `isOwner` (nav hidden — baik). Form non-owner perlu cek pola disabled (lihat §5 Q2). Belum diaudit per-baris. |
| **Pengaturan + 9 sub** | 1 | 1 | 1 | Submit `disabled={!isOwner}` (`settings-client.tsx:581,1075`) → non-owner lihat form "hidup" tapi tombol mati. 9 sub belum diaudit satu-satu. |
| **Login / Welcome** | 2 | 2 | 1 | Polish bagus (autofill mask, check-pop). Tapi `#0A0A0A` near-black **bukan token** (`login/page.tsx:34`, `welcome-screen.tsx:18`, `splash-screen.tsx:8`). |
| **Portal `/p/[token]`** | 2 | 1† | 1 | Forced-light **disengaja** (guardrail) → hex mentah = pengecualian sah. Tak ada `loading.tsx` (skeleton). Padat = cek 1F. |

**Catatan kejujuran:** baris **Laporan, Profil, Pengaturan-sub** dinilai dari sinyal struktural
(adopsi komponen berbagi, pola empty/loading, gating), **belum** baca per-baris tiap sub-halaman.
Skornya konservatif; bila perlu presisi, audit lanjutan per-sub direkomendasikan.

---

## 2. Temuan per kategori

### 1A — Token & warna

**Warna Tailwind mentah (di luar `globals.css`): 1 kemunculan.**

| File:baris | Ditemukan | Status |
|---|---|---|
| `components/bottom-nav.tsx:64` | `bg-red-500 ring-2 ring-black/40` (titik notif) | ✅ **Pengecualian sah** — prop `dot` belum di-wire ("siap pakai"); merah memang untuk notif. Tidak dinetralkan catch-all (disengaja). |

> Catch-all `globals.css:285–447` dikonfirmasi **utuh & menetralkan** raw green/red/amber/orange/violet/blue
> di light **dan** dark. Hanya `.text-masuk/.text-keluar` (class custom) & `bg-red-500` yang lolos
> catch-all — keduanya disengaja.

**Hex literal di `.tsx` — terklasifikasi:**

| Kelas | File:baris | Penilaian |
|---|---|---|
| **Pengecualian sah** | `app/p/[token]/page.tsx` (26,27,55,61,69,83,93,101,118,138,142,154,178) | Portal forced-light (guardrail). Hex = cara yang benar. |
| | `app/layout.tsx:22-23` | `themeColor` `#FAFAF9`/`#191919` = nilai token, di metadata (adaptif). |
| | `app/global-error.tsx:31,32,40,46,47` | Render **di luar** app (tanpa Tailwind/CSS) → inline style wajib; nilainya = token dark. |
| | `app/(dashboard)/pembelian/invoice-print.tsx` (~40 hex) | Dokumen cetak (string HTML). = token; cetak butuh warna eksplisit. |
| **Deliberate, tak ber-token** | `login/page.tsx:34`, `welcome-screen.tsx:18`, `splash-screen.tsx:8`, `offline/page.tsx:8` | `#0A0A0A` near-black (lebih gelap dari `--background` dark `#191919`). Layar imersif. **Saran:** jadikan token (mis. `--brand-screen-bg`). P2. |
| | `offline/page.tsx:10` | `text-[#FBBF24]` (= `--warn-fg` dark, tapi raw amber) → bisa `.text-warn`. P2. |
| **Token-bypass** (nilai = token, tapi hardcoded) | `components/sidebar.tsx` (119,127,128,134,173,174,180,247) | Sidebar desktop hardcode `bg-[#1E1E1E]`/`text-[#F3F4F6]`/`#9CA3AF`/`#7A7D85`; **punya `--sidebar*`** yg tak dipakai. `#1E1E1E ≠ --sidebar`(#191919). P2 (desktop-only). |
| | `ui/input.tsx:12`, `ui/textarea.tsx:10`, `ui/select.tsx:22` | `dark:bg-[#1E1E1E]` (≠ `--input` `#28282B`) — look "field cekung". Mungkin disengaja. P2. |
| | `components/profile-dialog.tsx:222` | `dark:bg-[#28282B]` (= `--popover`) → seharusnya `bg-popover`. P2 kosmetik. |
| **Token-divergence** (lebih "louder" dari token semantik) | `ui/field-error.tsx:14,23` | `#DC2626`/`#F87171` untuk error validasi ≠ `--crit` (`#A32D2D`/`#E68A8A`). |
| | `peron/kesehatan/page.tsx:86,90` | `#DC2626`/`#F87171` & `#B45309`/`#FBBF24` ≠ `--crit`/`--warn`. |
| | `peron/[id]/portal-link-card.tsx:80,106` | `#B45309`/`#FBBF24` & `#DC2626`/`#F87171` ≠ token. |
| **Regresi kontras** (lihat 1D) | `pembelian-form-dialog.tsx:353`, `pembelian-table.tsx:240`, `penjualan-table.tsx:142` | `dark:text-[#6B7280]` = **3.04:1** (gagal AA). Justru meng-undo upgrade `stone-400→#9CA3AF` yang catch-all lakukan. **P1.** |

### 1B — Spacing & ritme

**Arbitrary spacing (`p/m/gap/inset/...-[...]`): 5 kemunculan, semua optik/positioning — sah.**

| File:baris | Nilai | Untuk |
|---|---|---|
| `components/sidebar.tsx:78` | `top-[7px] bottom-[7px] w-[2px]` | Strip indikator tab aktif |
| `components/command-palette.tsx:235` | `top-[10%]` | Posisi vertikal palette |
| `components/bottom-nav.tsx:64` | `right-[9px] top-[9px]` | Titik notif |

> Skala layout (padding/margin/gap) **patuh 4/8/12/16/24**. Tidak ada nilai liar di tata letak.

**Fragmentasi type-scale (Premium):** 11 ukuran `text-[Npx]` arbitrer hidup berdampingan dengan
skala bernama Tailwind:

```
text-[11px]×78  text-[10px]×35  text-[13px]×30  text-[12px]×16  text-[15px]×8
text-[22px]×5   text-[9px]×4    text-[14px]×3   text-[34px/28px/26px]×1
```

`text-[12px]` == `text-xs`, `text-[14px]` == `text-sm` → dua jalur untuk ukuran sama. **Saran:**
konsolidasi ke set kecil (mis. `11/13/15` + skala bernama) lewat util/token. P2 (kraft premium).

**Perbandingan kartu daftar mobile (sumber: pembacaan 6 file):**

| Modul | Wrapper | Padding | Radius/Border | `.surface` | `press-card` | Angka |
|---|---|:--:|---|:--:|:--:|---|
| Pembelian (`:399`) | inline | `p-4` | `rounded-2xl border-black/[0.06]` | ❌ | ❌ | `num tabular-nums` |
| Penjualan (`:372`) | inline | `p-4` | `rounded-2xl border-black/[0.06]` | ❌ | ❌ | `num tabular-nums` |
| Kas (`:89`) | `.surface` | `p-4` | (token) | ✅ | ❌ | `num` |
| Biaya (`:98`) | `.surface` | `p-4` | (token) | ✅ | ❌ | `num` |
| Peron (`:176`) | `.surface` | `p-4` | (token) | ✅ | ✅ | `num` |
| Harga (`:163`) | `.surface` | `p-4` | (token) | ✅ | ❌ | `num` |

**3 divergensi:** (1) Pembelian/Penjualan tak pakai `.surface` (border + radius + bg duplikat manual);
(2) hanya Peron pakai `press-card`; (3) `tabular-nums` eksplisit cuma di Pembelian/Penjualan (lainnya
andalkan `.num`). Padding `p-4` seragam — bagus.

### 1C — Konsistensi komponen & motion

**4 overlay, 2 library, timing & scrim tak seragam:**

| Overlay | Library | Scrim | Durasi buka | Easing / gerak | Radius | Judul |
|---|---|---|:--:|---|:--:|---|
| **Dialog** (form) | `@radix-ui` | `black/25` + `blur-md` | **300ms** | `cubic-bezier(0.34,1.56,0.64,1)` **overshoot** + zoom-95 | `rounded-3xl` | `text-lg font-semibold` |
| **Sheet** (kebab HP) | `@base-ui` | `black/20` + `blur-md` | **200ms** | `ease-in-out`, slide 2.5rem | `rounded-t-2xl` | `text-base font-medium` |
| **AlertDialog** (konfirmasi) | `@base-ui` | `black/10` + `blur-xs` | **100ms** | default fade + zoom-95 | `rounded-xl` | `text-base font-medium` |
| **Dropdown** (kebab desktop) | `@base-ui` | — | **100ms** | default fade + zoom-95 + slide-2 | `rounded-lg` | — |

Sumber: `ui/dialog.tsx:22,41`, `ui/sheet.tsx:31,56`, `ui/alert-dialog.tsx:50,72`, `ui/dropdown-menu.tsx:44`.

**Yang terasa user (mobile, satu alur):** tap kebab ⋯ → Sheet **meluncur** (200ms) → "Edit" → Dialog
**memantul** (300ms overshoot) → "Hapus" → AlertDialog **njepret** (100ms). 3 kepribadian + 3 kedalaman
scrim dalam satu rangkaian. Plus judul Dialog (`text-lg/semibold`) lebih berat dari sheet/alert
(`text-base/medium`).

**Pembagian library:** `radix` = Dialog + Select (`@radix-ui/react-select`); `base-ui` =
Button/Sheet/AlertDialog/Dropdown/Switch. Migrasi parsial (sengaja ditunda — guardrail). **Rekomendasi
ada di §5 Q1.**

**Focus ring:**
- Input/Textarea/Select: `.neural-focus` → **border-only** (no ring), `globals.css:658-674`. **Konsisten ✓** (sesuai keputusan "border-only desaturasi").
- Button: `focus-visible:ring-2 ring-brand/50` (`button.tsx:7`).
- RowActionMenu trigger: `focus-visible:ring-2 ring-ring/50` (`row-action-menu.tsx:102`) — **warna ring beda** (`ring/50` netral vs `brand/50`).
→ 2 bahasa focus (field border-only vs tombol ring — disengaja) + **1 selisih warna ring** (P2).

**Radius:** komponen pakai `rounded-lg/xl/2xl/3xl` ter-map ke `--radius` via `@theme inline`
(`globals.css:44-50`); ukuran button pakai `rounded-[min(var(--radius-md),Npx)]` (token-derived).
**Tidak ada radius px hardcoded menyimpang.** ✓

**Sistem motion:** `motion` (framer) untuk nav/drawer/animated-rupiah; CSS `tw-animate` untuk overlay.
Dua sistem, tapi terpakai sesuai konteks (layout-anim butuh framer). Catat saja.

### 1D — Kontras WCAG (dihitung dari hex `globals.css`)

Ambang: normal **4.5:1**, besar/≥18px-bold **3:1**. (Skrip: `/tmp/ocm_wcag.py`, di luar repo.)

**Inti sistem — semua LULUS** (sorotan):

| Pasangan | Light | Dark |
|---|:--:|:--:|
| `foreground` / bg | 16.74 ✅ | 15.98 ✅ |
| `muted-foreground` / bg | **4.59** ✅ (paling mepet) | 6.93 ✅ |
| `muted-foreground` / card | 4.80 ✅ | 5.79 ✅ |
| `brand` / card | 6.25 ✅ | 6.88 ✅ |
| `ok/warn/crit-fg` / card (light) | 6.25 / 6.73 / 7.07 ✅ | — |
| pill-ok / pill-warn / pill-crit | 5.22 / 5.87 / 5.69 ✅ | 5.19 / 6.49 / **4.43 ⚠️** |
| white / `brand-solid` (tombol) | 5.33 ✅ | 5.33 ✅ |

**GAGAL — 5 titik:**

| # | Pasangan | Rasio | File:baris | Usulan (tetap monokrom+emerald) |
|---|---|:--:|---|---|
| 1 | `dark:text-[#6B7280]` label / card | **3.04** ❌ | `pembelian-form-dialog.tsx:353`, `pembelian-table.tsx:240`, `penjualan-table.tsx:142` | Hapus override → `text-muted-foreground` (`#9CA3AF` = **5.79** ✅). **P1.** |
| 2 | `.text-keluar` `#DC2626` / card (dark) | **3.04** ❌ | `status-pill.tsx:109` (ArahIndicator), `modal-history-table.tsx:81` | Salurkan ke token (lihat Q3); atau gelapkan vocab dark. **P1.** |
| 3 | `.text-masuk` `#16A34A` / card (light) | **3.30** ❌ | idem | `--ok-fg` (`#0B6E4F` = **6.25** ✅) sebagai pengganti. **P1.** |
| 4 | `.text-masuk` `#16A34A` / card (dark) | **4.46** ❌ (marginal) | idem | Naikkan ke `--ok-fg` dark (`#35C892` = 6.88 ✅). |
| 5 | pill-crit fg `#E68A8A` / bg (dark) | **4.43** ❌ (marginal) | token `globals.css:154` | Naikkan `--crit-fg` dark sedikit (mis. `#EC9A9A`) **atau** gelapkan `--crit-bg`. P2. |

> Catatan: `text-masuk/keluar` lolos catch-all (class custom) → di **dark** pun ter-render warna
> terang aslinya, itulah kenapa gagal di dark. Kesehatan-Peron pakai `#DC2626/#F87171` (lulus 4.6/5.3)
> tapi **value-nya beda** dari token — masalah konsistensi, bukan kontras (lihat 1A divergence).

### 1E — State coverage & dead code

**`loading.tsx`** — semua route (dashboard) primer punya. Nuansa:

| Route | loading.tsx | Catatan |
|---|:--:|---|
| dashboard, pembelian, penjualan, kas, biaya, laporan, harga, peron, peron/[id], peron/kesehatan/[id], profil, pengaturan | ✅ | Lengkap. |
| **peron/kesehatan (list)** | ⚠️ tak punya sendiri | Jatuh ke `peron/loading.tsx` (skeleton **list peron**) → bentuk mismatch dgn dashboard kesehatan. P2. |
| pengaturan/* (9 sub) | ➖ andalkan boundary induk | `pengaturan/loading.tsx` membungkus sub. Acceptable; per-sub bisa lebih presisi. |
| `/login`, `/p/[token]` | ➖ tak ada | Login = form klien (oke). Portal = SSR publik; skeleton akan menolong (P2). |

**`EmptyState`** — dipakai konsisten di **6 list modul + dashboard** (`pembelian/penjualan/kas/biaya/harga/peron-table` + `dashboard/page`). **Tidak** pakai komponen berbagi (empty ad-hoc):

| File:baris | Bentuk |
|---|---|
| `laporan-client.tsx:189,287` | teks polos + border-dashed (`:59`) |
| `peron/[id]/modal-history-table.tsx:58` | teks polos |
| `peron/kesehatan/page.tsx:114` | teks polos (state "kabar baik", bukan list kosong) |
| `peron/kesehatan/[id]/share-chart.tsx:15` | teks polos (chart kosong) |
| `app/p/[token]/page.tsx:116,136` | `<Empty>` sendiri (portal forced-light — terpisah, sah) |

**Dead code:**
- `ui/checkbox` & `ui/origin/*` yang disebut spec **tidak ada** (sudah bersih / tak pernah ada).
- **Tidak ada komponen `ui/*` yatim** — semua ≥1 importer (terendah: `dropdown-menu`, `sonner`, `table` masing-masing 1, semua terpakai).
- **Dead CSS:** `.bg-masuk/.bg-keluar/.bg-warning/.text-warning` (`globals.css:570-575`) **tak terpakai**;
  `--warning` token hanya lewat class mati + `.glow-warning`. Aman dirapikan nanti. P2.

---

## 3. Daftar fix berprioritas

### P0 — (tidak ada)
Tidak ditemukan pelanggaran kritis. Sistem inti sehat.

### P1 — legibility & konsistensi inti (lakukan dulu di Fase 2)
1. **Hapus override `dark:text-[#6B7280]`** (3 file) → `text-muted-foreground`. Memperbaiki kontras
   3.04→5.79. *(1A regresi + 1D #1)*
2. **Satukan kosakata arah kas hijau/merah** ke token muted (`--ok-fg/--crit-fg` atau token
   `--masuk/--keluar` yang digelapkan untuk dark). Perbaiki 3 kegagalan kontras (1D #2,#3,#4) **dan**
   hilangkan "dua hijau / dua merah". Sentuh: `status-pill.tsx:109`, `modal-history-table.tsx:81`.
   → **butuh keputusan Q3** dulu (warna arah boleh hijau/merah atau ikut monokrom?).

### P2 — craft & keseragaman
3. **Seragamkan motion overlay** — satu durasi (mis. 200ms buka / 150ms tutup) + satu easing
   (pakai `--ease-spring`/`--ease-out-expo` yg sudah ada), samakan scrim (`black/20` + `blur-md`).
   *Tak butuh migrasi library.* (1C)
4. **Pembelian/Penjualan → pakai `.surface`** agar sekeluarga dgn 4 modul lain. (1B)
5. **Kesehatan-Peron & portal-link-card & field-error → token `--crit/--warn`** (atau `.text-crit/.text-warn`)
   ganti hex `#DC2626/#B45309/#F87171/#FBBF24`. (1A divergence)
6. **`loading.tsx` khusus** untuk `peron/kesehatan` (list) + pertimbangkan untuk portal.
7. **Laporan → komponen `EmptyState` berbagi** (ganti border-dashed ad-hoc).
8. **`#0A0A0A` → token** (`--brand-screen-bg`) untuk login/welcome/splash/offline; `offline` amber → `.text-warn`.
9. **Sidebar desktop → pakai `--sidebar*`** (hapus hardcode hex); `profile-dialog:222` → `bg-popover`.
10. **Konsolidasi type-scale** (kurangi 11 ukuran px arbitrer); samakan warna ring focus (`ring/50` vs `brand/50`).
11. **Rapikan dead CSS** `.bg-masuk/.text-warning` dll. (`press-card` di Peron: putuskan — semua atau tak satu pun).
12. **`pill-crit` dark** naikkan kontras ke ≥4.5.

> Urutan commit Fase 2 (saran spec): warna mentah → spacing → kontras → state coverage → motion.
> Tiap kategori = 1 commit, lulus light & dark, lulus `tsc --noEmit`.

---

## 4. Status pilar (ringkas)

- **MINIMALIST** 🟢 — emerald hemat (CTA/aktif/brand), nol redundansi mencolok, 1 dot/kartu. Pengecualian:
  Beranda punya 4 aksi (by design).
- **COMPACT** 🟢 — skala spacing patuh, `p-4` seragam, padat. Cek runtime: tinggi hero & above-fold (1F).
- **PREMIUM** 🟡 — `tabular-nums`/`.num`/`text-right` kuat (67/76/86 kemunculan); satu radius via token;
  catch-all rapi. Yang menahan nilai: motion 4-overlay tak seragam, dua kosakata hijau/merah,
  type-scale terfragmentasi, 5 kontras gagal.

---

## 5. Pertanyaan / keputusan untuk Ichza

**Q1 — Penyatuan library primitif (`@radix-ui` ↔ `@base-ui`).**
Saat ini Dialog + Select = radix; sisanya base-ui. Guardrail: jangan migrasi diam-diam.
**Opsi:** (a) **tunda** migrasi, cukup **seragamkan token motion** lintas-library sekarang (risiko rendah,
≈½ hari) — *rekomendasi*; (b) migrasi Dialog+Select → base-ui agar 1 library (risiko sedang, perlu
regресi-test semua form & dropdown). **Keputusan?**

**Q2 — Profil/Pajak/Perusahaan: `disabled` → `hidden`?**
Non-owner kini melihat form **utuh & seakan bisa diisi**, tapi submit `disabled={!isOwner}`
(`settings-client.tsx:581,1075`) → jalan buntu. **Usulan:** untuk non-owner, ganti form dengan
**ringkasan read-only + pesan "khusus owner"** (tetap menghormati pembatasan owner — guardrail).
Setuju ubah pola ini di Fase 2?

**Q3 — Warna arah kas: hijau/merah terang dipertahankan?**
`ArahIndicator` (Masuk/Keluar) & mutasi modal pakai `#16A34A/#DC2626` **terang** — beda dari pill
`--ok/--crit` yang **teredam**, dan gagal kontras (terutama dark). **Opsi:** (a) salurkan ke token
muted `--ok/--crit` (konsisten + lulus AA) — *rekomendasi*; (b) pertahankan hijau/merah terang sebagai
konvensi finansial, tapi **gelapkan nilainya** agar lulus AA (mis. masuk `#15803D`, keluar `#B91C1C`).
Pilih (a) atau (b)?

**Q4 — `press-card` di kartu:** terapkan ke **semua** modul (umpan-balik tap konsisten) atau **cabut**
dari Peron? (sekarang hanya Peron).

---

## 6. Checklist 1F — verifikasi runtime manual (393×852, light & dark)

1F otomatis **dilewati** (butuh sesi Better Auth + dev server untuk 14 layar × 2 tema — tak praktis
headless tanpa kredensial Turso). Ganti jadi checklist untuk Ichza:

- [ ] **Beranda:** hero "Total Kas" ≤ 30% tinggi viewport?
- [ ] **Beranda:** ≥ 4 kartu transaksi terlihat tanpa scroll?
- [ ] **Tiap list (Pembelian/Penjualan/Kas/Biaya/Peron/Harga):** ≥ 4 kartu above-fold?
- [ ] **Semua layar:** area emerald terasa ≤ 10%? (CTA/tab aktif/brand saja)
- [ ] **Tap target** kebab ⋯, dot status, ikon nav ≥ 44px?
- [ ] **Dark mode:** label kecil (`#6B7280`) di Pembelian/Penjualan terbaca di bawah cahaya? *(diprediksi gagal — 1D #1)*
- [ ] **Buku Kas dark:** panah Masuk/Keluar terbaca? *(diprediksi marginal/gagal — 1D #2,#4)*
- [ ] **Tidak ada blok kosong besar** di bawah daftar (semua modul)?
- [ ] **Motion:** buka Dialog vs Sheet vs AlertDialog — terasa "beda kepribadian"? *(diprediksi ya — 1C)*

---

## 7. Kepatuhan guardrail

| Item guardrail | Diperlakukan sebagai |
|---|---|
| Bottom nav ikon-only | ✅ Final. Tidak diusulkan label. (notif dot dicatat sah) |
| Tombol hapus netral (`--destructive`) | ✅ Final. `RowActionMenu` destructive pakai `text-crit` + bg netral — konsisten. |
| Portal forced-light | ✅ Final. Hex mentah portal = pengecualian sah (bukan pelanggaran). |
| `thermal_paper_width` di localStorage | ✅ Tidak disentuh. |
| Oranye/amber mentah = NOL | ✅ Tidak ada oranye/amber baru diusulkan. Amber `offline`/`warn-fg` dicatat sbg pakai-token. |
| Edit Profil/Pajak owner-only | ✅ Pembatasan **dipertahankan**; hanya UX pola disabled diangkat sbg pertanyaan (Q2), bukan beri akses non-owner. |
| Dua library primitif | ✅ **Tidak** dimigrasi. Dilaporkan + rekomendasi (Q1), tunggu keputusan. |
| `jakartaDateString()`/`todayString()` | ✅ Tidak disentuh. |

---

## 8. Selisih vs snapshot

- **Kode HEAD `42b01b5`** vs **snapshot ref `3319ecd`** (knowledge base) / **konteks `7662a5f`**.
- HEAD = **1 commit setelah** `7662a5f`, yaitu `42b01b5` *"feat(backup): backup harian otomatis ke
  Vercel Blob"* — **server/cron saja, nol dampak visual**. Lapisan UI cocok dengan memory `7662a5f`
  (kartu compact + kebab + StatusDotLabel).
- **Aksi:** `snapshot-app.md` tertinggal pada lapisan **non-visual** (backup cron). Untuk audit visual
  ini, tak ada divergensi UI yang relevan. Saran: perbarui snapshot saat ada commit UI berikutnya.
- `snapshot-app.md` (21KB) **tidak** di-diff baris-per-baris di Fase 1 — di luar lingkup audit visual.

---

## ⛔ BERHENTI — Fase 1 selesai. Menunggu approval Ichza sebelum Fase 2.

**Acceptance Fase 1:** ✅ laporan lengkap tanpa perubahan kode · ✅ rubrik 14 baris terisi ·
✅ warna mentah terdaftar (semua sah/teridentifikasi) · ✅ spacing liar terdaftar (semua optik/sah) ·
✅ tabel kontras lengkap + usulan untuk yang gagal · ✅ beda Dialog↔Sheet terdokumentasi + rekomendasi
(belum dieksekusi) · ✅ daftar loading/EmptyState yang belum ada · ✅ pertanyaan keputusan terangkum ·
✅ guardrail nol pelanggaran.

---

# ✅ FASE 2 — HASIL IMPLEMENTASI & KOREKSI PASCA-IMPLEMENTASI

> Ditambahkan 2026-06-18 setelah Fase 2 disetujui & dieksekusi. **6 commit** (lokal → produksi).
> Tiap batch: `tsc --noEmit` lulus, light & dark aman via token, logika data tak disentuh, guardrail utuh.

## Batch yang dikerjakan

| Commit | Batch | Ringkas |
|---|---|---|
| `907432b` | **A** Token & kontras | arah kas `.text-masuk/.text-keluar` → `var(--ok-fg)/var(--crit-fg)`; hex Kesehatan-Peron & portal-link-card → `.text-crit/.text-warn`; buang override `dark:text-[#6B7280]` & var `--masuk/--keluar` |
| `74f7cdb` | **B** Motion | satu easing `--ease-out-expo` + durasi 200/150ms, overshoot Dialog dibuang; scrim 3 modal seragam `black/25`+blur-md; Dropdown/Select ringan tanpa scrim; dua-library ditandai utang teknis |
| `a48171f` | **C** `.surface` | kartu mobile Pembelian/Penjualan border-inline → `.surface` (sekeluarga; dark tak lagi samar) |
| `615b6c4` | **E** Warna sisa | `field-error` merah validasi → `--crit`; `#0A0A0A` → token `--brand-screen-bg`; offline amber → `--brand-screen-warn` |
| `e3cab65` | **D** Read-only | Profil Perusahaan & Pajak non-owner → `<form inert>` read-only + banner "khusus pemilik" + submit disembunyikan (server `setAppSettings` tetap menolak non-owner) |
| `e788ffa` | **press-card** | dicopot dari 6 kartu non-tappable (rule #4); CSS utilitas dipertahankan berdokumentasi |

## ⚠️ Koreksi atas 2 temuan Fase 1 (terbukti keliru saat implementasi)

1. **`dark:text-[#6B7280]` BUKAN kegagalan kontras live (revisi 1D #1 & 1A).**
   Catch-all `html.dark [class~="text-stone-400"] { color:#9CA3AF !important }` berada di luar `@layer`
   dan ber-`!important` → **menimpa** `dark:text-[#6B7280]` (yang tanpa `!important`). Jadi label-label itu
   **sudah ter-render `#9CA3AF` (5.79:1, LULUS)**, bukan 3.04:1. Menghapus override = pembersihan hex-mati,
   **nol perubahan visual**. Kontras yang benar-benar gagal & nyata diperbaiki = kosakata arah kas
   (`#16A34A` light 3.30:1, `#DC2626` dark 3.04:1).

2. **`press-card` BUKAN Peron-only (revisi rubrik "Peron list" & daftar fix #11).**
   Dipakai di **6 kartu**: `peron-table:176`, `peron/page:30`, `biaya-table:191`, `harga/page:29+38`,
   `dashboard/akun-carousel:120`. Peta tappability tuntas: **tak satu pun badan kartunya membuka detail**
   (semua hero/stat/display/list; aksi lewat kebab). Karena `press-card` = afordans palsu di semua,
   ia dicopot dari ke-6 (rule #4: press-card hanya di kartu yang buka detail). CSS `.press-card`
   dipertahankan sebagai utilitas (berdokumentasi) untuk kartu tappable di masa depan.

## Keputusan Ichza yang terpakai (rujuk §5)

- **Q1 library:** seragamkan token motion, **jangan** migrasi; dua-library = utang teknis (komentar di `dialog.tsx`).
- **Q2 disabled→hidden:** non-owner dapat tampilan **read-only (`inert`) + pesan**, pembatasan tulis tetap.
- **Q3 arah kas:** satukan ke `--ok/--crit` (tetap hijau/merah, versi lulus AA).
- **Q4 press-card:** selaraskan tappability → karena nol kartu tappable, dicopot dari semua.

## Sisa terbuka (tak dieksekusi, sengaja)

- Verifikasi mata (checklist 1F) saat produksi — server preview tak tersedia headless.
- Konsolidasi type-scale (P2 #10), `loading.tsx` untuk peron/kesehatan & portal (P2 #6), Laporan→EmptyState (P2 #7),
  sidebar desktop `--sidebar*` & profile-dialog `bg-popover` (P2 #9), dead CSS `.bg-masuk/.text-warning` (P2 #11) —
  semua tetap backlog P2, belum disentuh.
