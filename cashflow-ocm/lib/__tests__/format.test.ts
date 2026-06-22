import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  formatCompact,
  formatRentangKotak,
  formatRentangReplas,
  notaReplasBaris,
  buildKeteranganReplas,
  isAutoKeteranganReplas,
  notaKeteranganReplas,
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

describe('notaReplasBaris (meta per-baris nota)', () => {
  it('jumlah + tanggal → "N | tanggal" (angka saja, pemisah ASCII)', () => {
    expect(notaReplasBaris(5, '2026-06-13', '2026-06-15')).toBe('5 | 13–15 Jun')
    expect(notaReplasBaris(3, '2026-06-16')).toBe('3 | 16 Jun')
  })
  it('jumlah saja (tanpa tanggal) → "N"', () => {
    expect(notaReplasBaris(2, null)).toBe('2')
    expect(notaReplasBaris('4')).toBe('4')
  })
  it('tanpa jumlah (<1) tapi ada tanggal → tanggal saja', () => {
    expect(notaReplasBaris(0, '2026-06-16')).toBe('16 Jun')
    expect(notaReplasBaris(null, '2026-06-16')).toBe('16 Jun')
  })
  it('keduanya kosong → string kosong (baris disembunyikan)', () => {
    expect(notaReplasBaris(null, null)).toBe('')
    expect(notaReplasBaris(0)).toBe('')
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
  it('menjumlah replas lintas baris (ringkasan tanpa rentang — tanggal kini per baris RINCIAN)', () => {
    const out = buildKeteranganReplas(
      [
        { tonase: 1000, jumlahReplas: 2, tanggalReplas: '2026-06-04', tanggalReplasSampai: '2026-06-05' },
        { tonase: 500, jumlahReplas: 1, tanggalReplas: '2026-06-06' },
      ],
      '2026-06-04',
    )
    expect(out).toBe('Total 3 Replas')
  })
  it('baris tonase 0 diabaikan; semua 0 → kosong', () => {
    expect(buildKeteranganReplas([{ tonase: 0, jumlahReplas: 5 }], '2026-06-04')).toBe('')
  })
  it('menerima detail bentuk string (dari form)', () => {
    const out = buildKeteranganReplas(
      [{ tonase: '1000', jumlahReplas: '4', tanggalReplas: '2026-06-10' }],
      '2026-06-10',
    )
    expect(out).toBe('Total 4 Replas')
  })
  it('1 replas → singular benar', () => {
    expect(buildKeteranganReplas([{ tonase: 500, jumlahReplas: 1, tanggalReplas: '2026-06-07' }], '2026-06-07'))
      .toBe('Total 1 Replas')
  })
  it('ada tonase tapi TANPA data replas → kosong (tak ada "Total 0 Replas")', () => {
    // non-TBS / brondolan: tonase terisi, jumlahReplas kosong/null/0.
    expect(buildKeteranganReplas([{ tonase: 1200 }], '2026-06-04')).toBe('')
    expect(buildKeteranganReplas([{ tonase: 1200, jumlahReplas: 0 }], '2026-06-04')).toBe('')
    expect(buildKeteranganReplas([{ tonase: '1200', jumlahReplas: '' }], '2026-06-04')).toBe('')
  })
})

describe('isAutoKeteranganReplas', () => {
  it('mengenali pola auto "Total N Replas"', () => {
    expect(isAutoKeteranganReplas('Total 3 Replas (4–6 Juni)')).toBe(true)
    expect(isAutoKeteranganReplas('Total 0 Replas (4 Juni)')).toBe(true)
    expect(isAutoKeteranganReplas('Total 1 Replas (7 Juni)')).toBe(true)
  })
  it('teks manual / kosong → bukan pola auto', () => {
    expect(isAutoKeteranganReplas('Bonus lebaran')).toBe(false)
    expect(isAutoKeteranganReplas('Total bayar tunai')).toBe(false)
    expect(isAutoKeteranganReplas('')).toBe(false)
    expect(isAutoKeteranganReplas(null)).toBe(false)
    expect(isAutoKeteranganReplas(undefined)).toBe(false)
  })
})

describe('notaKeteranganReplas (satu sumber nota visual & thermal)', () => {
  const detailsTBS = [{ tonase: 1000, jumlahReplas: 3, tanggalReplas: '2026-06-04', tanggalReplasSampai: '2026-06-06' }]
  const detailsTanpaReplas = [{ tonase: 1200 }]

  it('derive dari field replas saat tersimpan null', () => {
    expect(notaKeteranganReplas(null, detailsTBS, '2026-06-04')).toBe('Total 3 Replas')
  })
  it('abaikan nilai auto tersimpan yang basi → derive ulang dari detail', () => {
    expect(notaKeteranganReplas('Total 9 Replas (1 Jan)', detailsTBS, '2026-06-04')).toBe('Total 3 Replas')
  })
  it('tanpa data replas → kosong walau tersimpan "Total 0 Replas" (baris hilang seragam)', () => {
    expect(notaKeteranganReplas('Total 0 Replas (4 Juni)', detailsTanpaReplas, '2026-06-04')).toBe('')
    expect(notaKeteranganReplas(null, detailsTanpaReplas, '2026-06-04')).toBe('')
  })
  it('hormati keterangan manual', () => {
    expect(notaKeteranganReplas('Bonus lebaran', detailsTanpaReplas, '2026-06-04')).toBe('Bonus lebaran')
    expect(notaKeteranganReplas('  Titip salam  ', detailsTBS, '2026-06-04')).toBe('Titip salam')
  })

  // Regresi bug nota Thermer (multi-baris "RINCIAN TONASE"): keterangan harus
  // teragregasi lintas SEMUA pembelian_detail, bukan baris pertama saja. Fungsi ini
  // dipakai identik oleh keempat mode nota (A5 / thermal preview / Thermer / gambar),
  // jadi jaminan di sini berlaku untuk semua mode.
  describe('multi-baris (>1 pembelian_detail)', () => {
    const multiReplas = [
      { tonase: 1000, jumlahReplas: 2, tanggalReplas: '2026-06-04', tanggalReplasSampai: '2026-06-05' },
      { tonase: 800, jumlahReplas: 1, tanggalReplas: '2026-06-06' },
    ]
    const multiSebagian = [
      { tonase: 1000, jumlahReplas: 4, tanggalReplas: '2026-06-04' },
      { tonase: 800 }, // baris ke-2 tanpa replas
    ]
    const multiTanpaReplas = [{ tonase: 1000 }, { tonase: 800 }]

    it('data replas teragregasi lintas semua baris → muncul', () => {
      expect(notaKeteranganReplas(null, multiReplas, '2026-06-04')).toBe('Total 3 Replas')
    })
    it('replas hanya di sebagian baris → tetap teragregasi (tak bergantung baris pertama)', () => {
      expect(notaKeteranganReplas(null, multiSebagian, '2026-06-04')).toBe('Total 4 Replas')
    })
    it('stored auto basi diabaikan → derive ulang dari semua baris', () => {
      expect(notaKeteranganReplas('Total 99 Replas (1 Jan)', multiReplas, '2026-06-04')).toBe('Total 3 Replas')
    })
    it('multi-baris TANPA replas & tanpa catatan → kosong (tak ada baris kosong / "Total 0 Replas")', () => {
      expect(notaKeteranganReplas(null, multiTanpaReplas, '2026-06-04')).toBe('')
    })
    it('keterangan manual tetap dihormati di multi-baris', () => {
      expect(notaKeteranganReplas('Titip 2 karung', multiReplas, '2026-06-04')).toBe('Titip 2 karung')
    })
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
