import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  formatCompact,
  formatRentangKotak,
  formatRentangReplas,
  buildKeteranganReplas,
  jakartaDateString,
} from '../format'

describe('formatCompact', () => {
  it('miliar / juta / ribu (sesuai contoh docstring)', () => {
    expect(formatCompact(1_234_567_890)).toBe('Rp 1,23 M')
    expect(formatCompact(296_801_560)).toBe('Rp 296,8 jt')
    expect(formatCompact(45_000)).toBe('Rp 45 rb')
  })
  it('di bawah seribu apa adanya', () => {
    expect(formatCompact(500)).toBe('Rp 500')
    expect(formatCompact(0)).toBe('Rp 0')
  })
  it('negatif diawali tanda minus', () => {
    expect(formatCompact(-1_500_000)).toBe('-Rp 1,5 jt')
  })
})

describe('formatRentangKotak (bulan pendek)', () => {
  it('tunggal', () => {
    expect(formatRentangKotak('2026-06-04')).toBe('4 Jun')
    expect(formatRentangKotak('2026-06-04', '2026-06-04')).toBe('4 Jun')
  })
  it('rentang dalam bulan sama', () => {
    expect(formatRentangKotak('2026-06-04', '2026-06-05')).toBe('4–5 Jun')
  })
  it('rentang beda bulan, tahun sama', () => {
    expect(formatRentangKotak('2026-05-30', '2026-06-02')).toBe('30 Mei – 2 Jun')
  })
  it('rentang beda tahun', () => {
    expect(formatRentangKotak('2025-12-28', '2026-01-03')).toBe('28 Des 2025 – 3 Jan 2026')
  })
  it('input tak valid → string kosong', () => {
    expect(formatRentangKotak('bukan-tanggal')).toBe('')
  })
})

describe('formatRentangReplas (bulan panjang)', () => {
  it('tunggal vs rentang', () => {
    expect(formatRentangReplas('2026-06-07', '2026-06-07')).toBe('7 Juni')
    expect(formatRentangReplas('2026-06-04', '2026-06-07')).toBe('4–7 Juni')
    expect(formatRentangReplas('2026-05-30', '2026-06-02')).toBe('30 Mei – 2 Juni')
  })
})

describe('buildKeteranganReplas', () => {
  it('menjumlah replas & merentang tanggal', () => {
    const out = buildKeteranganReplas(
      [
        { tonase: 1000, jumlahReplas: 2, tanggalReplas: '2026-06-04', tanggalReplasSampai: '2026-06-05' },
        { tonase: 500, jumlahReplas: 1, tanggalReplas: '2026-06-06' },
      ],
      '2026-06-04',
    )
    expect(out).toBe('Total 3 Replas (4–6 Juni)')
  })
  it('baris tonase 0 diabaikan; semua 0 → kosong', () => {
    expect(buildKeteranganReplas([{ tonase: 0, jumlahReplas: 5 }], '2026-06-04')).toBe('')
  })
  it('menerima detail bentuk string (dari form)', () => {
    const out = buildKeteranganReplas(
      [{ tonase: '1000', jumlahReplas: '4', tanggalReplas: '2026-06-10' }],
      '2026-06-10',
    )
    expect(out).toBe('Total 4 Replas (10 Juni)')
  })
})

describe('jakartaDateString (WIB)', () => {
  afterEach(() => vi.useRealTimers())
  it('memakai zona Asia/Jakarta — dini hari WIB tidak mundur sehari', () => {
    // 14 Jun 2026 19:00 UTC = 15 Jun 2026 02:00 WIB → harus "2026-06-15".
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14T19:00:00Z'))
    expect(jakartaDateString()).toBe('2026-06-15')
  })
  it('offsetDays menggeser tanggal', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T05:00:00Z')) // 12:00 WIB
    expect(jakartaDateString(0)).toBe('2026-06-15')
    expect(jakartaDateString(-1)).toBe('2026-06-14')
    expect(jakartaDateString(-7)).toBe('2026-06-08')
  })
})
