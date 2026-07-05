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

/**
 * Ubah tarif tersimpan di `app_settings` (string PERSEN, mis. "11" → 11%) menjadi
 * pecahan yang dipakai kalkulasi (0.11). Kosong / bukan angka / di luar rentang
 * wajar → kembalikan `fallback` (default konstanta). Rentang wajar: 0 < persen <
 * 100 (→ 0 < pecahan < 1); di luar itu (0, negatif, ≥100, NaN) dianggap salah
 * input & diabaikan agar laporan tak pernah crash / salah ekstrem.
 */
export function parseTarifPersen(stored: string | null | undefined, fallback: number): number {
  const persen = parseFloat(String(stored ?? '').trim())
  if (!Number.isFinite(persen)) return fallback
  const pecahan = persen / 100
  if (pecahan <= 0 || pecahan >= 1) return fallback
  return pecahan
}
