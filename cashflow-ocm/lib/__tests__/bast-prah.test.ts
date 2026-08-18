import { describe, expect, it } from 'vitest'
import { buildPrahBastSourceKeys, extractPrahBastRows, normalizeBastNumber } from '../bast-prah'

describe('parser Prah dari BAST', () => {
  it('membaca tabel Kotor, Tara, Netto 1 untuk Katimin dan Doni', () => {
    const rows = extractPrahBastRows([
      'GR0600099001 16/08/2026 KH 8597 GQ KATIMIN 14.250 4.150 10.100',
      'GR0600099002 16/08/2026 KH 8123 AB DONI 13.800 4.000 9.800',
    ].join('\n'))
    expect(rows).toMatchObject([
      { truk: 'katimin', noTid: 'GR0600099001', tanggal: '2026-08-16', tonaseKotor: 14250, tonaseNetto1: 10100 },
      { truk: 'doni', noTid: 'GR0600099002', tanggal: '2026-08-16', tonaseKotor: 13800, tonaseNetto1: 9800 },
    ])
  })

  it('mendukung label eksplisit dan alias Dodi sebagai Doni', () => {
    const rows = extractPrahBastRows('Supir DODI Berat Kotor: 12.900 kg Netto 1: 8.750 kg')
    expect(rows[0]).toMatchObject({ truk: 'doni', tonaseKotor: 12900, tonaseNetto1: 8750 })
  })

  it('tidak mengambil angka bila berat kotor tidak dapat dipastikan', () => {
    expect(extractPrahBastRows('KATIMIN Netto 1 9.500 kg Total Harga 35.000.000')).toEqual([])
  })

  it('mengikat TID dan tanggal pada record yang sama untuk PDF multiline', () => {
    const rows = extractPrahBastRows([
      'GR0600000001',
      '15/08/2026',
      'KATIMIN',
      '14.250',
      '4.150',
      '10.100',
      'GR0600000002',
      '16/08/2026',
      'DONI',
      '13.800',
      '4.000',
      '9.800',
    ].join('\n'))
    expect(rows).toMatchObject([
      { truk: 'katimin', noTid: 'GR0600000001', tanggal: '2026-08-15', tonaseKotor: 14250, tonaseNetto1: 10100 },
      { truk: 'doni', noTid: 'GR0600000002', tanggal: '2026-08-16', tonaseKotor: 13800, tonaseNetto1: 9800 },
    ])
  })

  it('membaca tanggal dan sopir yang berada sebelum TID pada baris yang sama', () => {
    const rows = extractPrahBastRows('16/08/2026 KATIMIN GR0600000001 14.250 4.150 10.100')
    expect(rows).toMatchObject([
      { truk: 'katimin', noTid: 'GR0600000001', tanggal: '2026-08-16', tonaseKotor: 14250, tonaseNetto1: 10100 },
    ])
  })

  it('membaca metadata sebelum TID multiline tanpa mencampur record tetangga', () => {
    const rows = extractPrahBastRows([
      '15/08/2026',
      'KATIMIN',
      'GR0600000001',
      '14.250',
      '4.150',
      '10.100',
      '16/08/2026',
      'DONI',
      'GR0600000002',
      '13.800',
      '4.000',
      '9.800',
    ].join('\n'))
    expect(rows).toMatchObject([
      { truk: 'katimin', noTid: 'GR0600000001', tanggal: '2026-08-15', tonaseKotor: 14250, tonaseNetto1: 10100 },
      { truk: 'doni', noTid: 'GR0600000002', tanggal: '2026-08-16', tonaseKotor: 13800, tonaseNetto1: 9800 },
    ])
  })

  it('menolak judul berisi dua sopir dan angka total di sekitarnya', () => {
    expect(extractPrahBastRows('DAFTAR SOPIR KATIMIN DAN DONI\nTotal 14.250 4.150 10.100')).toEqual([])
  })

  it('tidak menebak pasangan tonase dari angka biaya dan netto saja', () => {
    expect(extractPrahBastRows('KATIMIN biaya 12.000 pendapatan 1.400.000 netto 9.500')).toEqual([])
  })

  it('membuat kunci stabil dan membedakan perjalanan identik tanpa TID', () => {
    const row = { tanggal: '2026-08-16', truk: 'doni' as const, noTid: '', tonaseKotor: 12000, tonaseNetto1: 8000 }
    expect(buildPrahBastSourceKeys([row, row])).toEqual([
      '2026-08-16:doni:12000:8000',
      '2026-08-16:doni:12000:8000:2',
    ])
    expect(normalizeBastNumber('  bast  01/ocm ')).toBe('BAST 01/OCM')
  })

  it('menyimpan duplicate identik dengan TID yang sama tepat satu kali', () => {
    const record = 'GR0600000001 16/08/2026 KATIMIN 14.250 4.150 10.100'
    expect(extractPrahBastRows([record, record].join('\n'))).toHaveLength(1)

    const row = { tanggal: '2026-08-16', truk: 'katimin' as const, noTid: 'GR0600000001', tonaseKotor: 14250, tonaseNetto1: 10100 }
    expect(buildPrahBastSourceKeys([row, row])).toEqual(['GR0600000001', 'GR0600000001'])
  })

  it('menolak TID sama yang menunjuk payload perjalanan berbeda', () => {
    expect(() => extractPrahBastRows([
      'GR0600000001 16/08/2026 KATIMIN 14.250 4.150 10.100',
      'GR0600000001 16/08/2026 KATIMIN 14.300 4.150 10.150',
    ].join('\n'))).toThrow('TID GR0600000001 muncul lebih dari sekali dengan data berbeda')

    expect(() => buildPrahBastSourceKeys([
      { tanggal: '2026-08-16', truk: 'katimin', noTid: 'GR0600000001', tonaseKotor: 14250, tonaseNetto1: 10100 },
      { tanggal: '2026-08-16', truk: 'katimin', noTid: 'gr0600000001', tonaseKotor: 14300, tonaseNetto1: 10150 },
    ])).toThrow('TID GR0600000001 muncul lebih dari sekali dengan data berbeda')
  })
})
