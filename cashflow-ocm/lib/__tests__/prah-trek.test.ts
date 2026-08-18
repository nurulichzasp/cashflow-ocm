import { describe, expect, it } from 'vitest'
import {
  hitungKeuntunganPrah,
  hitungPendapatanPrah,
  PRAH_BIAYA_SOPIR,
  PRAH_TARIF_PER_KG,
} from '../prah-trek'

describe('Prah Trek', () => {
  it('menghitung pendapatan dari tarif Rp140 dikali tonase kotor', () => {
    expect(hitungPendapatanPrah(12_500)).toBe(1_750_000)
    expect(hitungPendapatanPrah(10_000, PRAH_TARIF_PER_KG)).toBe(1_400_000)
  })

  it('membulatkan pendapatan ke rupiah penuh untuk tonase pecahan', () => {
    expect(hitungPendapatanPrah(12_500.5)).toBe(1_750_070)
  })

  it('mengurangi BBM dan Rp200 ribu per prah dari pendapatan', () => {
    expect(hitungKeuntunganPrah({
      pendapatan: 3_500_000,
      biayaSopir: PRAH_BIAYA_SOPIR * 2,
      biayaBbm: 900_000,
    })).toBe(2_200_000)
  })

  it('tetap menampilkan rugi bila biaya melebihi pendapatan', () => {
    expect(hitungKeuntunganPrah({ pendapatan: 500_000, biayaSopir: 200_000, biayaBbm: 400_000 })).toBe(-100_000)
  })
})
