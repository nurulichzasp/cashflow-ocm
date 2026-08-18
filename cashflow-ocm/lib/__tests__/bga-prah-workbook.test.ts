import { describe, expect, it } from 'vitest'
import { bastNumberFromFilename, selectActivePrahSheetNames } from '../bga-prah-workbook'

describe('pemilihan sheet Prah workbook BGA', () => {
  const sheetNames = [
    'OCM R1-BAST 1 HARGA',
    'OCM R2-BAST 1 HARGA',
    'OCM R1-BAST 2 HARGA',
    'OCM R2-BAST 2 HARGA',
    'BAST OCMP SAGU 2 HARGA',
    'OCM-BAST BRDL KTWM',
  ]

  it('membuang template stale dan hanya memilih kategori rekap yang bernilai', () => {
    expect(selectActivePrahSheetNames({
      sheetNames,
      rekapRows: [
        { ket: 'TBS', area: 'KTWM', total: 0, dibayar: 0 },
        { ket: 'TBS RING2', area: 'KTWM', total: 100, dibayar: 110 },
      ],
      rekap2Rows: [
        { ket: 'TBS', area: 'KTWM', total: 0, dibayar: 0 },
        { ket: 'TBS RING2', area: 'KTWM', total: 200, dibayar: 220 },
        { ket: 'TBS PERON SAGU', area: 'KTWM', total: 300, dibayar: 330 },
        { ket: 'BRDL', area: 'KTWM', total: 50, dibayar: 55 },
      ],
    })).toEqual([
      'OCM R2-BAST 1 HARGA',
      'OCM R2-BAST 2 HARGA',
      'BAST OCMP SAGU 2 HARGA',
      'OCM-BAST BRDL KTWM',
    ])
  })

  it('membuat nomor BAST stabil dari nama file saat dokumen tidak punya nomor formal', () => {
    expect(bastNumberFromFilename('  06.CV OCM 26-28 MEI 2026.xlsx  ')).toBe('06.CV OCM 26-28 MEI 2026')
  })
})
