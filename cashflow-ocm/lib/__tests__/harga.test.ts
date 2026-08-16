import { describe, it, expect } from 'vitest'
import {
  CAP_KEUNTUNGAN_PERON,
  SELISIH_JUAL_BGA,
  effectiveKelebihanPeron,
  effectiveKeuntunganPerKg,
  effectiveKelebihanPeronBerlaku,
  effectiveKeuntunganPerKgBerlaku,
  keuntunganPerKgBerlaku,
  isKategoriTBS,
  isProdukTBS,
  resolveTarifPeron,
  effectiveKelebihanPeronDenganAturan,
} from '../harga'

// untungCV → kelebihan = 120 − untungCV
const untungDariKelebihan = (kelebihan: number) => SELISIH_JUAL_BGA - kelebihan

describe('cap kelebihan peron (non-TBS)', () => {
  it('di bawah cap → tetap (kelebihan 40)', () => {
    expect(effectiveKelebihanPeron(untungDariKelebihan(40), false)).toBe(40)
  })
  it('di atas cap → jadi 50 (kelebihan 65)', () => {
    expect(effectiveKelebihanPeron(untungDariKelebihan(65), false)).toBe(50)
  })
  it('jauh di atas cap → jadi 50 (kelebihan 90)', () => {
    expect(effectiveKelebihanPeron(untungDariKelebihan(90), false)).toBe(50)
  })
  it('tepat di cap → 50 (kelebihan 50)', () => {
    expect(effectiveKelebihanPeron(untungDariKelebihan(50), false)).toBe(50)
  })
  it('default peron untungCV 50 → kelebihan 70 → di-cap 50', () => {
    expect(effectiveKelebihanPeron(50, false)).toBe(50)
  })
})

describe('rombak tarif peron mulai 15 Agustus 2026', () => {
  it('tidak mengubah tarif sebelum tanggal berlaku', () => {
    expect(keuntunganPerKgBerlaku('Husein', '2026-08-14', 40)).toBe(40)
    expect(effectiveKelebihanPeronBerlaku(30, false, '2026-08-14')).toBe(50)
  })

  it.each(['Husein', 'Wiranto', 'Jono', 'Neko', 'Roni'])(
    '%s mendapat kelebihan 90',
    (nama) => {
      const untung = keuntunganPerKgBerlaku(nama, '2026-08-15', 99)
      expect(untung).toBe(30)
      expect(effectiveKelebihanPeronBerlaku(untung, true, '2026-08-15')).toBe(90)
      expect(effectiveKelebihanPeronBerlaku(untung, false, '2026-08-15')).toBe(90)
    },
  )

  it.each(['Budi', 'Ciput', 'Iwan', 'Nolin', 'Pribadi', 'Umum'])(
    '%s mendapat kelebihan 70',
    (nama) => {
      const untung = keuntunganPerKgBerlaku(nama, '2026-08-15', 99)
      expect(untung).toBe(50)
      expect(effectiveKelebihanPeronBerlaku(untung, true, '2026-08-15')).toBe(70)
      expect(effectiveKelebihanPeronBerlaku(untung, false, '2026-08-15')).toBe(70)
    },
  )

  it('Ibnu tetap memakai tarif tersimpan', () => {
    expect(keuntunganPerKgBerlaku('Ibnu', '2026-08-15', 80)).toBe(80)
    expect(keuntunganPerKgBerlaku(' ibnu ', '2026-09-01', 65)).toBe(65)
  })

  it('BRDL memakai kelebihan dan untung efektif yang sama dengan TBS', () => {
    expect(effectiveKelebihanPeronBerlaku(30, false, '2026-08-15')).toBe(90)
    expect(effectiveKeuntunganPerKgBerlaku(30, false, '2026-08-15')).toBe(30)
    expect(effectiveKelebihanPeronBerlaku(30, true, '2026-08-15')).toBe(90)
    expect(effectiveKeuntunganPerKgBerlaku(30, true, '2026-08-15')).toBe(30)
  })
})

describe('jadwal tarif fleksibel dari database', () => {
  const rows = [
    { tanggalBerlaku: '2026-08-15', kelebihanPerKg: 90, brdlSamaTbs: true },
    { tanggalBerlaku: '2026-09-01', kelebihanPerKg: 75, brdlSamaTbs: false },
  ]

  it('memilih jadwal terakhir pada atau sebelum tanggal transaksi', () => {
    expect(resolveTarifPeron(rows, '2026-08-31', 80)).toEqual({ keuntunganPerKg: 30, brdlSamaTbs: true })
    expect(resolveTarifPeron(rows, '2026-09-01', 80)).toEqual({ keuntunganPerKg: 45, brdlSamaTbs: false })
  })

  it('Ibnu/tanpa jadwal tetap memakai tarif dasar dan aturan BRDL lama', () => {
    expect(resolveTarifPeron([], '2026-08-15', 80)).toEqual({ keuntunganPerKg: 80, brdlSamaTbs: false })
  })

  it('flag BRDL benar-benar mengendalikan cap', () => {
    expect(effectiveKelebihanPeronDenganAturan(30, false, true)).toBe(90)
    expect(effectiveKelebihanPeronDenganAturan(30, false, false)).toBe(50)
  })
})

describe('TBS tidak di-cap', () => {
  it('kelebihan 90 tetap 90', () => {
    expect(effectiveKelebihanPeron(untungDariKelebihan(90), true)).toBe(90)
  })
  it('kelebihan 40 tetap 40', () => {
    expect(effectiveKelebihanPeron(untungDariKelebihan(40), true)).toBe(40)
  })
})

describe('untung CV efektif (floor non-TBS)', () => {
  it('non-TBS untungCV 30 → floor ke 70 (120−50)', () => {
    expect(effectiveKeuntunganPerKg(30, false)).toBe(SELISIH_JUAL_BGA - CAP_KEUNTUNGAN_PERON)
    expect(effectiveKeuntunganPerKg(30, false)).toBe(70)
  })
  it('non-TBS untungCV 80 (di atas floor) → tetap 80', () => {
    expect(effectiveKeuntunganPerKg(80, false)).toBe(80)
  })
  it('TBS untungCV 30 → tetap 30 (tanpa floor)', () => {
    expect(effectiveKeuntunganPerKg(30, true)).toBe(30)
  })
  it('konsisten: harga jual BGA = acuan + selisih (untung + kelebihan = 120)', () => {
    for (const untungCV of [10, 30, 50, 70, 90]) {
      const kel = effectiveKelebihanPeron(untungCV, false)
      const unt = effectiveKeuntunganPerKg(untungCV, false)
      expect(kel + unt).toBe(SELISIH_JUAL_BGA)
    }
  })
})

describe('contoh before/after Harga Beli (acuan 1500, untungCV 30 → kelebihan 90)', () => {
  const acuan = 1500
  it('peron dibayar TURUN (1590 → 1550), untung CV NAIK (30 → 70)', () => {
    const before = acuan + (SELISIH_JUAL_BGA - 30) // tanpa cap
    const after = acuan + effectiveKelebihanPeron(30, false) // dengan cap
    expect(before).toBe(1590)
    expect(after).toBe(1550)
    expect(after).toBeLessThan(before)
    // Harga Jual BGA tetap acuan + 120 di kedua kasus
    expect(acuan + effectiveKelebihanPeron(30, false) + effectiveKeuntunganPerKg(30, false)).toBe(acuan + SELISIH_JUAL_BGA)
    expect(effectiveKeuntunganPerKg(30, false)).toBe(70)
  })
})

describe('klasifikasi produk/kategori', () => {
  it('kategori TBS', () => {
    expect(isKategoriTBS('OCM R1')).toBe(true)
    expect(isKategoriTBS('OCM R2')).toBe(true)
    expect(isKategoriTBS('OCMP SAGU')).toBe(true)
  })
  it('kategori brondolan = non-TBS', () => {
    for (const k of ['OCM BRDL', 'OCM BRDL KTWM', 'OCM BRDL TRYM', 'OCM BRDL LMDM']) {
      expect(isKategoriTBS(k)).toBe(false)
    }
  })
  it('produk acuan', () => {
    expect(isProdukTBS('TBS')).toBe(true)
    expect(isProdukTBS('BRDL KTWM')).toBe(false)
    expect(isProdukTBS('BRDL LMDM')).toBe(false)
  })
})
