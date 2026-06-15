// Perhitungan pajak MURNI (tanpa I/O / DB) — satu sumber rumus, bisa diuji unit.
// Tarif default Indonesia 2026: PPN 11%, PPh Badan 22%. Diekstrak dari
// laporan/actions.ts agar logika uang punya jaring pengaman test.
// CATATAN: app_settings punya key tax_tarif_ppn / tax_tarif_pph_badan yang BISA
// diubah owner, tapi belum di-wire ke kalkulasi ini (masih pakai default). Param
// `tarif` opsional disiapkan supaya penyambungan setting itu nanti sepele.

export const TARIF_PPN = 0.11
export const TARIF_PPH_BADAN = 0.22
/** Default angsuran PPh 25 bulanan (dipakai bila belum ada record bulan itu). */
export const DEFAULT_PPH25_NOMINAL = 698_917

/** PPN keluaran atas dasar pengenaan pajak (DPP), dibulatkan ke rupiah. */
export function hitungPpn(dpp: number, tarif: number = TARIF_PPN): number {
  return Math.round(dpp * tarif)
}

/**
 * PPh Badan atas laba operasional. Rugi → 0 (tak ada "pajak negatif";
 * kerugian dikompensasi, bukan jadi kredit pajak).
 */
export function hitungPphBadan(labaOperasional: number, tarif: number = TARIF_PPH_BADAN): number {
  return Math.max(0, Math.round(labaOperasional * tarif))
}
