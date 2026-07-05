import { describe, it, expect } from 'vitest'
import { hitungPpn, hitungPphBadan, parseTarifPersen, TARIF_PPN, TARIF_PPH_BADAN } from '../pajak'

describe('hitungPpn', () => {
  it('PPN 11% dibulatkan ke rupiah', () => {
    expect(hitungPpn(1_000_000)).toBe(110_000)
    expect(hitungPpn(296_801_560)).toBe(Math.round(296_801_560 * 0.11)) // 32_648_172
  })
  it('nol → nol', () => {
    expect(hitungPpn(0)).toBe(0)
  })
  it('membulatkan (bukan memotong)', () => {
    // 5 * 0.11 = 0.55 → 1
    expect(hitungPpn(5)).toBe(1)
  })
  it('menerima tarif kustom', () => {
    expect(hitungPpn(1000, 0.1)).toBe(100)
  })
  it('tarif default = 11%', () => {
    expect(TARIF_PPN).toBe(0.11)
  })
})

describe('hitungPphBadan', () => {
  it('PPh Badan 22% atas laba operasional', () => {
    expect(hitungPphBadan(1_000_000)).toBe(220_000)
  })
  it('rugi → 0 (tak ada pajak negatif)', () => {
    expect(hitungPphBadan(-5_000_000)).toBe(0)
    expect(hitungPphBadan(0)).toBe(0)
  })
  it('membulatkan ke rupiah', () => {
    expect(hitungPphBadan(1_000_001)).toBe(Math.round(1_000_001 * 0.22)) // 220_000
  })
  it('tarif default = 22%', () => {
    expect(TARIF_PPH_BADAN).toBe(0.22)
  })
})

describe('parseTarifPersen', () => {
  it('persen valid tersimpan → pecahan', () => {
    expect(parseTarifPersen('11', TARIF_PPN)).toBe(0.11)
    expect(parseTarifPersen('22', TARIF_PPH_BADAN)).toBe(0.22)
    expect(parseTarifPersen('12.5', TARIF_PPN)).toBe(0.125)
  })
  it('kosong / null / undefined → fallback', () => {
    expect(parseTarifPersen('', TARIF_PPN)).toBe(TARIF_PPN)
    expect(parseTarifPersen(null, TARIF_PPN)).toBe(TARIF_PPN)
    expect(parseTarifPersen(undefined, TARIF_PPH_BADAN)).toBe(TARIF_PPH_BADAN)
  })
  it('bukan angka → fallback', () => {
    expect(parseTarifPersen('abc', TARIF_PPN)).toBe(TARIF_PPN)
  })
  it('di luar rentang wajar (≤0 atau ≥100%) → fallback', () => {
    expect(parseTarifPersen('0', TARIF_PPN)).toBe(TARIF_PPN)
    expect(parseTarifPersen('-5', TARIF_PPN)).toBe(TARIF_PPN)
    expect(parseTarifPersen('100', TARIF_PPN)).toBe(TARIF_PPN)
    expect(parseTarifPersen('150', TARIF_PPN)).toBe(TARIF_PPN)
  })
  it('menyerap spasi di sekitar angka', () => {
    expect(parseTarifPersen('  11  ', TARIF_PPN)).toBe(0.11)
  })
})
