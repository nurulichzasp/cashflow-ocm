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
