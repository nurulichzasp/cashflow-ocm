import { describe, it, expect } from 'vitest'
import { hitungPpn, hitungPphBadan, TARIF_PPN, TARIF_PPH_BADAN } from '../pajak'

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
