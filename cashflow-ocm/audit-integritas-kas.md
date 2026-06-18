# 🔍 Audit Integritas Total Kas (READ-ONLY)

**Repo:** `nurulichzasp/cashflow-ocm` · **HEAD:** `7807a99` · **Tanggal:** 2026-06-18
**Sifat:** AUDIT SAJA — nol perubahan kode, tak ada migrasi. Semua temuan dikutip dari source.

> **Catatan konteks:** integritas kas P0 ini sudah pernah dikonfirmasi AMAN pada audit 15 Jun 2026
> (commit `2c10c77`) dan tindak-lanjutnya sudah live. Audit ini memverifikasi **ulang dari source
> terkini** dan menjadi deliverable formal yang sebelumnya belum dibuat sebagai file tersendiri.

---

## 1. Ringkasan eksekutif

**Bisakah Total Kas melenceng? → TIDAK (bersyarat-aman).** Model saldo **derived** (dihitung
on-the-fly dari `transaksi_kas`, akun tak menyimpan saldo), jadi tak ada kolom yang bisa "drift"
diam-diam. Setiap mutasi induk yang menyentuh kas (create/edit/delete di Pembelian, Penjualan,
Biaya, Modal Peron) menulis/membalik entri `transaksi_kas` anak **di dalam satu `db.transaction`
atomik**, dan EDIT memakai pola **hapus-lalu-buat-ulang** sehingga perubahan nominal/akun/tanggal/
status selalu ter-sinkron. Entri kas otomatis (`refTabel` terisi) **diblok** dari hapus/edit manual.
Tidak ditemukan satu pun jalur di mana field kas berubah tanpa entri kas anak ikut berubah.

**Residual (rendah, bukan drift):** entri kas anak tak punya `idempotencyKey` sendiri (dimitigasi
oleh transaksi atomik + `idempotencyKey` unik di induk); dan ada satu kelonggaran sah saat fase
setup tanpa akun kas (lihat §Temuan). Semua **Rendah/Informasional** — tak ada Kritis/Sedang.

---

## 2. Model saldo — **DERIVED** (aman)

- `lib/saldo.ts:1-28` — satu sumber rumus: `saldo akun = saldoAwal + Σ(masuk) − Σ(keluar)` atas
  baris `transaksi_kas` (`netMutasi` :10-12, `saldoPerAkun` :19-28). Komentar :3-5 menegaskan
  "akun_kas tak simpan saldo, dihitung on-the-fly".
- `lib/db/schema.ts` — tabel `akunKas` **tidak punya** kolom saldo tersimpan; `transaksiKas`
  (`schema.ts:212-238`) adalah satu-satunya sumber mutasi. `akun_kas` hanya simpan `saldoAwal`.
- **Implikasi:** tak ada nilai saldo yang di-update incremental → **tak ada vektor drift klasik**.
  Saldo selalu = rekomputasi penuh. Risiko: **Rendah** (desain benar).

---

## 3. Tabel temuan

| # | Lokasi (file:baris) | Skenario | Risiko | Dampak ke saldo | Saran fix (1 baris) |
|---|---|---|:--:|---|---|
| 1 | semua `*/actions.ts` insert `transaksiKas` (mis. `pembelian/actions.ts:163-175`, `penjualan/actions.ts:97-108`, `biaya/actions.ts:104-114`, `peron/actions.ts:194-204`) | Entri kas anak **tak** kirim `idempotencyKey` (induk kirim) | Rendah | Teoretis: retry bisa dobel kas. **Mitigasi kuat:** child di-insert di dalam `db.transaction` yang sama dgn induk; induk punya `idempotencyKey` + uniqueIndex → submit-ganda induk gagal → seluruh transaksi rollback → child tak dobel. | (Opsional) kirim `idempotencyKey` turunan ke child + uniqueIndex, utk pertahanan berlapis. |
| 2 | `peron/actions.ts:157-162` | `addModalPeron` jenis `tambah`/`kembali` tanpa `akunSumberId`: validasi "pilih akun" **hanya** dipaksakan bila sudah ada ≥1 akun kas (`adaAkun.length > 0`) | Informasional | Tak ada drift saat sistem kas aktif. Hanya saat **NOL akun kas** (fase setup) modal bisa dicatat tanpa kas-out — tapi saat itu memang belum ada saldo untuk melenceng. | Sengaja (komentar :153-156). Biarkan; pertimbangkan guard saat akun dihapus mundur. |

> **Tidak ada temuan Kritis maupun Sedang.** Dua baris di atas Rendah/Informasional.

---

## 4. Peta sumber mutasi kas (per modul) — terverifikasi

### Pembelian (`app/(dashboard)/pembelian/actions.ts`)
- **create** (`:85-225`): tulis `transaksi_kas` **hanya bila `statusBayarPeron==='lunas'`** (`:163`),
  `arah:'keluar'`, `akunId:sumberBayarId`, `jumlah:totalBeli`, `refTabel:'pembelian'`, `refId:id`
  (`:166-172`). *Belum lunas → tak ada kas (benar: belum bayar peron).*
- **update** (`:227-324`): **atomik** (`db.transaction` :248) — **hapus** semua kas anak by
  `refTabel/refId` (`:283`) lalu **buat ulang** bila lunas+sumberBayar (`:284-297`). Nominal/akun/
  status berubah → ter-sinkron. ✓
- **delete** (`:326-367`): **atomik** (`:341-344`) — `tx.delete(transaksiKas where refTabel='pembelian',refId=id)` + `tx.delete(pembelian)`. ✓

### Penjualan (`app/(dashboard)/penjualan/actions.ts`)
- **create** (`:51-143`): tulis kas **hanya bila `statusBayar==='lunas'`** (`:94`), `arah:'masuk'`,
  `akunId:akunUtama.id`, `jumlah:totalNilai`, `tanggal:tanggalBayarBga||tanggal` (`:97-108`).
- **updatePenjualanStatus** (`:145-197`) — **JAWABAN pertanyaan khusus spec:** kas masuk dari
  penjualan ke BGA dicatat **saat status = `lunas`** (bukan otomatis saat dibuat, kecuali dibuat
  sudah-lunas). Action ini **atomik** (`:153`): hapus kas lama (`:159-161`) → insert kas-masuk
  **bila `lunas`** (`:164-179`). Toggle `lunas↔belum` menambah/menghapus kas dgn benar → kas
  **selalu cermin status**. ✓ (Konsisten, bukan timing-bug.)
- **update** (`:199+`/`:217-247`): atomik, hapus+buat-ulang bila lunas. ✓
- **delete** (`:265-290`): atomik (`:270-273`). ✓

### Biaya Operasional (`app/(dashboard)/biaya/actions.ts`)
- **create** (`:49-148`): **selalu** tulis kas (`:104-114`), `arah:'keluar'` (biaya = kas keluar
  seketika), `refTabel:'biaya_operasional'`. Atomik (`:91`).
- **update** (`:179-208`): atomik, hapus (`:190`) + **selalu** buat ulang (`:191-201`). ✓
- **delete** (`:226-253`): atomik (`:233-236`). ✓

### Modal Peron (`app/(dashboard)/peron/actions.ts`)
- **addModalPeron** (`:137-208`): tulis kas **bila `akunSumberId` & (jenis `tambah`|`kembali`)**
  (`:193-205`): `tambah→keluar`, `kembali→masuk`; **`kurang`→TIDAK** menggerakkan kas (potong
  tagihan internal, benar). Atomik (`:179`). Lihat Temuan #2 utk kelonggaran no-akun.
- **deleteModalPeron** (`:225-249`): atomik (`:230-234`). **Tak ada fungsi update** → tak ada
  edit-reversal yang perlu diaudit.

---

## 5. Jawaban checklist spec

| # | Item | Temuan |
|---|---|---|
| 1 | Model saldo | **Derived** (`lib/saldo.ts`); akun tak simpan saldo. **Aman.** |
| 2 | Peta mutasi | Lengkap di §4. Tiap create/edit/delete menulis/membalik kas anak. |
| 3 | Reversal saat EDIT | Pola **hapus-lalu-buat-ulang** di `db.transaction` → nominal/akun/arah/tanggal/status ter-sinkron. **Tak ada drift.** (Modal peron tak punya update.) |
| 4 | Reversal saat DELETE | **Manual** di server action (bukan FK cascade — `transaksi_kas` tak punya FK ke induk, `schema.ts:230-231`), di dalam `db.transaction`. Tak ada entri yatim dari jalur normal. |
| 5 | Atomicity | **Semua** create/update/delete dibungkus `db.transaction`. ✓ |
| 6 | Proteksi entri auto | `deleteTransaksiKas` **memblok** hapus manual entri `refTabel` (`kas/actions.ts:146-159`: throw "otomatis dari pembelian/penjualan/biaya"); `updateTransaksiKas` selaras (memblok edit). ✓ **Celah ditutup.** |
| 7 | Soft vs hard delete | **Hard delete** (tak ada kolom `deletedAt` di tabel transaksi; `schema.ts`). Saldo tak perlu mengecualikan baris → tak ada drift soft-delete. |
| 8 | Idempotency | Induk: `idempotencyKey` + uniqueIndex (mis. `schema.ts:235-238` utk transaksi_kas; tiap induk punya). Anak `transaksi_kas` dari induk **tak** kirim key sendiri — dimitigasi transaksi atomik (Temuan #1). |

---

## 6. Skenario yang sudah AMAN (tak perlu disentuh)

- Hitung saldo & Total Kas (derived, satu rumus teruji `lib/saldo.ts`).
- Reversal kas pada **delete** semua modul (atomik, manual by refTabel/refId).
- Reversal kas pada **edit** Pembelian/Penjualan/Biaya (hapus-lalu-buat-ulang atomik).
- Penjualan: kas mengikuti status `lunas` secara konsisten (create + updateStatus).
- Proteksi entri kas otomatis dari hapus/edit manual (`deleteTransaksiKas`/`updateTransaksiKas`).
- Atomicity seluruh "induk + kas anak".

## 7. Rekomendasi fase 2 (opsional, prioritas rendah)

1. **(Rendah) `idempotencyKey` pada entri kas anak** — turunan deterministik (mis. hash
   `refTabel|refId|akunId|arah|jumlah`) + uniqueIndex, sebagai pertahanan berlapis selain transaksi
   atomik. Saat ini sudah aman secara praktis.
2. **(Informasional) Guard akun kas dihapus mundur** — bila kelak akun kas bisa dihapus saat sudah
   ada transaksi, pastikan tak meninggalkan mutasi tergantung akun yang hilang (di luar lingkup
   integritas kas inti; saat ini saldo abaikan baris ber-akun tak dikenal — `saldo.ts:26`).

---

## 8. Cek data nyata (orphan) — PERLU CEK MANUAL

Tidak dijalankan di sini (audit ini tak menyentuh DB produksi tanpa setup eksplisit). Analisis kode
sudah membuktikan jalur normal **tak bisa** membuat yatim (delete atomik). Untuk memastikan tak ada
sisa data lama/tampering, jalankan **read-only** di Turso (mis. Drizzle Studio / `turso db shell`):

```sql
-- transaksi_kas yatim: punya refTabel/refId tapi induknya sudah tak ada
SELECT k.id, k.ref_tabel, k.ref_id, k.arah, k.jumlah, k.tanggal
FROM transaksi_kas k
WHERE k.ref_tabel IS NOT NULL AND (
  (k.ref_tabel='pembelian'        AND NOT EXISTS (SELECT 1 FROM pembelian         p WHERE p.id=k.ref_id)) OR
  (k.ref_tabel='penjualan'        AND NOT EXISTS (SELECT 1 FROM penjualan         p WHERE p.id=k.ref_id)) OR
  (k.ref_tabel='biaya_operasional'AND NOT EXISTS (SELECT 1 FROM biaya_operasional b WHERE b.id=k.ref_id)) OR
  (k.ref_tabel='modal_peron'      AND NOT EXISTS (SELECT 1 FROM modal_peron       m WHERE m.id=k.ref_id))
);
-- Hasil 0 baris = tak ada yatim → Total Kas akurat.
```

---

## ⛔ Selesai. READ-ONLY — nol perubahan kode, `snapshot-app.md`/`konteks-ocm.md` TIDAK disentuh.
Fix (kalau Ichza mau ambil rekomendasi §7) = fase 2 terpisah.
