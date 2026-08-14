/**
 * Sumber tunggal konstanta & derivasi harga/margin OCM.
 *
 * Model:
 *   Harga Jual BGA = acuan.hargaLapangan + selisihJualBga   (selisih TETAP 120)
 *   Kelebihan peron = bonus/kg yang dibayar ke peron DI ATAS acuan
 *                   = selisihJualBga − untungCV(peron.keuntunganPerKg)
 *   Harga Beli (ke peron) = acuan + kelebihan = Harga Jual BGA − untungCV
 *   Untung CV/kg = selisihJualBga − kelebihan = untungCV
 *
 * Cap: untuk produk NON-TBS (brondolan), "kelebihan peron" dibatasi maksimal
 * CAP_KEUNTUNGAN_PERON. Efeknya peron dibayar lebih rendah & untung CV ter-floor
 * (Harga Jual BGA tetap acuan + selisih). TBS TIDAK dibatasi.
 *
 * CLAMP HANYA SEKALI di {@link effectiveKelebihanPeron} — fungsi lain men-derive
 * dari sana, jangan meng-clamp ulang.
 */

/** Selisih jual ke BGA per kg (TBS & BRDL). TETAP 120 — jangan diubah. */
export const SELISIH_JUAL_BGA = 120

/** Batas maksimal "kelebihan peron" (bonus di atas acuan) untuk produk NON-TBS. */
export const CAP_KEUNTUNGAN_PERON = 50

/** Rombakan tarif peron mulai 15 Agustus 2026 (berdasarkan tanggal transaksi). */
export const TANGGAL_TARIF_PERON_BARU = '2026-08-15'

const KELEBIHAN_90 = new Set(['husein', 'wiranto', 'jono', 'neko', 'roni'])
const KELEBIHAN_70 = new Set(['budi', 'ciput', 'iwan', 'nolin', 'pribadi', 'umum'])

function normalizeNamaPeron(nama: string): string {
  return nama.trim().toLocaleLowerCase('id-ID')
}

/**
 * Menghasilkan untung CV/kg yang berlaku untuk sebuah transaksi.
 *
 * Mulai 2026-08-15:
 * - Husein, Wiranto, Jono, Neko, Roni: kelebihan 90 → untung CV 30.
 * - Budi, Ciput, Iwan, Nolin, Pribadi, Umum: kelebihan 70 → untung CV 50.
 * - Ibnu dan nama lain tetap memakai tarif yang tersimpan di data peron.
 */
export function keuntunganPerKgBerlaku(
  namaPeron: string,
  tanggal: string,
  keuntunganPerKgTersimpan: number,
  selisihJualBga: number = SELISIH_JUAL_BGA,
): number {
  if (tanggal < TANGGAL_TARIF_PERON_BARU) return keuntunganPerKgTersimpan

  const nama = normalizeNamaPeron(namaPeron)
  if (KELEBIHAN_90.has(nama)) return selisihJualBga - 90
  if (KELEBIHAN_70.has(nama)) return selisihJualBga - 70
  return keuntunganPerKgTersimpan
}

/** Mulai tanggal tarif baru, kelebihan BRDL sama dengan TBS (tanpa cap Rp50). */
export function brdlMengikutiKelebihanTbs(tanggal: string): boolean {
  return tanggal >= TANGGAL_TARIF_PERON_BARU
}

/** Kategori pembelian yang tergolong TBS (bukan brondolan). */
export function isKategoriTBS(kategori: string): boolean {
  return kategori === 'OCM R1' || kategori === 'OCM R2' || kategori === 'OCMP SAGU'
}

/** Produk harga acuan yang tergolong TBS. */
export function isProdukTBS(produk: string): boolean {
  return produk === 'TBS'
}

/**
 * Kelebihan peron EFEKTIF per kg (bonus di atas acuan yang benar-benar dibayar).
 * Non-TBS dibatasi maksimal CAP_KEUNTUNGAN_PERON; TBS apa adanya.
 * Ini SATU-SATUNYA titik clamp.
 */
export function effectiveKelebihanPeron(
  keuntunganPerKg: number,
  isTBS: boolean,
  selisihJualBga: number = SELISIH_JUAL_BGA,
): number {
  const raw = selisihJualBga - keuntunganPerKg
  return isTBS ? raw : Math.min(raw, CAP_KEUNTUNGAN_PERON)
}

/**
 * Untung CV EFEKTIF per kg = selisih − kelebihan efektif. Untuk non-TBS otomatis
 * ter-floor ke (selisih − CAP) sehingga Harga Jual BGA tetap acuan + selisih.
 */
export function effectiveKeuntunganPerKg(
  keuntunganPerKg: number,
  isTBS: boolean,
  selisihJualBga: number = SELISIH_JUAL_BGA,
): number {
  return selisihJualBga - effectiveKelebihanPeron(keuntunganPerKg, isTBS, selisihJualBga)
}

/** Versi bertanggal untuk transaksi pembelian; aturan lama tetap berlaku sebelum 15 Agustus. */
export function effectiveKelebihanPeronBerlaku(
  keuntunganPerKg: number,
  isTBS: boolean,
  tanggal: string,
  selisihJualBga: number = SELISIH_JUAL_BGA,
): number {
  const raw = selisihJualBga - keuntunganPerKg
  return isTBS || brdlMengikutiKelebihanTbs(tanggal)
    ? raw
    : Math.min(raw, CAP_KEUNTUNGAN_PERON)
}

/** Untung CV/kg efektif untuk transaksi pada tanggal tertentu. */
export function effectiveKeuntunganPerKgBerlaku(
  keuntunganPerKg: number,
  isTBS: boolean,
  tanggal: string,
  selisihJualBga: number = SELISIH_JUAL_BGA,
): number {
  return selisihJualBga - effectiveKelebihanPeronBerlaku(
    keuntunganPerKg,
    isTBS,
    tanggal,
    selisihJualBga,
  )
}
