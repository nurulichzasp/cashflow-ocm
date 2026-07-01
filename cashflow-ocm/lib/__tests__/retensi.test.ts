import { describe, it, expect } from 'vitest'
import { SELISIH_JUAL_BGA, CAP_KEUNTUNGAN_PERON } from '../harga'
import {
  hitungPertahanan,
  floorUntungCV,
  hargaOCMPeron,
  labaBerisiko,
  isPeronUmum,
  RETENSI_DEFAULT_AMBANG,
} from '../retensi'

const FLOOR_BRDL = SELISIH_JUAL_BGA - CAP_KEUNTUNGAN_PERON // 70

describe('floorUntungCV', () => {
  it('brondolan = SELISIH − CAP (di-derive, bukan 70 hardcode)', () => {
    expect(floorUntungCV(false)).toBe(FLOOR_BRDL)
  })
  it('TBS = minMarginTbs (default 40, bisa override)', () => {
    expect(floorUntungCV(true)).toBe(40)
    expect(floorUntungCV(true, 35)).toBe(35)
  })
})

describe('hargaOCMPeron', () => {
  it('brondolan mentok di acuan+CAP walau K sangat rendah', () => {
    // K=50 → kelebihan 70 tapi di-cap ke 50
    expect(hargaOCMPeron(1000, 50, false)).toBe(1000 + CAP_KEUNTUNGAN_PERON)
    // K=90 → kelebihan 30 (di bawah cap)
    expect(hargaOCMPeron(1000, 90, false)).toBe(1030)
  })
  it('TBS tanpa cap', () => {
    expect(hargaOCMPeron(1000, 40, true)).toBe(1000 + (SELISIH_JUAL_BGA - 40))
  })
})

describe('hitungPertahanan — AMAN', () => {
  it('gap ≤ ambang → AMAN, tidak menurunkan margin', () => {
    // brondolan K=90 → hargaOCM = acuan+30. kompetitor hanya +10 di atasnya.
    const r = hitungPertahanan({ keuntunganPerKg: 90, isTBS: false, acuan: 1000, hargaKompetitor: 1030 + 10 })
    expect(r.status).toBe('aman')
    expect(r.Kbaru).toBe(90)
    expect(r.turunMargin).toBe(0)
    expect(r.bisaDipertahankanPenuh).toBe(true)
  })
  it('gap negatif (OCM lebih tinggi) → AMAN', () => {
    const r = hitungPertahanan({ keuntunganPerKg: 90, isTBS: false, acuan: 1000, hargaKompetitor: 1000 })
    expect(r.status).toBe('aman')
    expect(r.gap).toBeLessThan(0)
    expect(r.turunMargin).toBe(0)
  })
})

describe('hitungPertahanan — TERANCAM brondolan bisa dipertahankan', () => {
  it('menutup TEPAT ke ambang, bukan ke harga kompetitor penuh', () => {
    // brondolan K=90, acuan=1000, hargaOCM=1030. kompetitor=1070 → gap=40, ambang=20.
    const r = hitungPertahanan({ keuntunganPerKg: 90, isTBS: false, acuan: 1000, hargaKompetitor: 1070, ambang: 20 })
    expect(r.status).toBe('terancam')
    expect(r.kenaikanDibutuhkan).toBe(20) // gap 40 − ambang 20
    expect(r.Kbaru).toBe(70) // 90 − 20, tepat di floor
    expect(r.hargaOCMbaru).toBe(1050) // acuan + 50 (cap)
    expect(r.gapSisa).toBe(20) // = ambang, tidak dikejar ke 0
    expect(r.bisaDipertahankanPenuh).toBe(true)
    expect(r.mentokCap).toBe(false)
    expect(r.turunMargin).toBe(20)
  })
})

describe('hitungPertahanan — brondolan MENTOK cap', () => {
  it('hargaKompetitor > acuan+CAP+ambang → tak bisa dipertahankan penuh & mentok', () => {
    // acuan=1000, CAP=50, ambang=20 → batas = 1070. kompetitor 1100 > 1070.
    const r = hitungPertahanan({ keuntunganPerKg: 90, isTBS: false, acuan: 1000, hargaKompetitor: 1100, ambang: 20 })
    expect(r.status).toBe('terancam')
    expect(r.Kbaru).toBe(FLOOR_BRDL) // dipaksa ke floor
    expect(r.hargaOCMbaru).toBe(1000 + CAP_KEUNTUNGAN_PERON) // mentok acuan+cap
    expect(r.bisaDipertahankanPenuh).toBe(false)
    expect(r.mentokCap).toBe(true)
    expect(r.atFloor).toBe(true)
  })
})

describe('hitungPertahanan — TBS di floor', () => {
  it('TBS terancam & sudah di floor → keputusan bisnis, bukan mentok cap', () => {
    // TBS K=40 (floor), acuan=1000 → kelebihan=80, hargaOCM=1080. kompetitor jauh di atas.
    const r = hitungPertahanan({ keuntunganPerKg: 40, isTBS: true, acuan: 1000, hargaKompetitor: 1200, ambang: 20, minMarginTbs: 40 })
    expect(r.status).toBe('terancam')
    expect(r.Kbaru).toBe(40) // tak bisa turun di bawah floor
    expect(r.turunMargin).toBe(0)
    expect(r.bisaDipertahankanPenuh).toBe(false)
    expect(r.mentokCap).toBe(false) // bukan cap brondolan
    expect(r.atFloor).toBe(true)
  })
})

describe('hitungPertahanan — cost/benefit', () => {
  it('biaya = Δ×volume, laba-berisiko = untungEfektif(K)×volume', () => {
    const r = hitungPertahanan({ keuntunganPerKg: 90, isTBS: false, acuan: 1000, hargaKompetitor: 1070, ambang: 20, volume: 10_000 })
    expect(r.turunMargin).toBe(20)
    expect(r.biayaPertahanan).toBe(20 * 10_000)
    expect(r.labaDipertahankan).toBe(70 * 10_000) // untung efektif di Kbaru=70
    expect(r.labaRisikoJikaLepas).toBe(90 * 10_000) // untung efektif di K=90
  })
  it('volume tak diketahui → semua angka rupiah null', () => {
    const r = hitungPertahanan({ keuntunganPerKg: 90, isTBS: false, acuan: 1000, hargaKompetitor: 1070 })
    expect(r.biayaPertahanan).toBeNull()
    expect(r.labaDipertahankan).toBeNull()
    expect(r.labaRisikoJikaLepas).toBeNull()
  })
})

describe('labaBerisiko & isPeronUmum', () => {
  it('labaBerisiko null bila volume null', () => {
    expect(labaBerisiko(90, false, null)).toBeNull()
    expect(labaBerisiko(90, false, 1000)).toBe(90 * 1000)
  })
  it('isPeronUmum case-insensitive', () => {
    expect(isPeronUmum('Umum')).toBe(true)
    expect(isPeronUmum(' umum ')).toBe(true)
    expect(isPeronUmum('Pak Budi')).toBe(false)
  })
  it('ambang default = 20', () => {
    expect(RETENSI_DEFAULT_AMBANG).toBe(20)
  })
})
