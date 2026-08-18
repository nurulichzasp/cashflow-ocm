type RekapPrahRow = {
  ket: string
  area: string
  total: number
  dibayar: number
}

function hasValue(row: RekapPrahRow): boolean {
  return Number(row.total) > 0 || Number(row.dibayar) > 0
}

function matchesSheet(row: RekapPrahRow, sheetName: string): boolean {
  const sheet = sheetName.toUpperCase()
  const ket = row.ket.toUpperCase()
  const area = row.area.toUpperCase()

  if (sheet.includes('BRDL')) {
    if (!ket.includes('BRDL')) return false
    for (const mill of ['KTWM', 'TRYM', 'LMDM']) {
      if (sheet.includes(mill)) return area.includes(mill)
    }
    return true
  }
  if (sheet.includes('SAGU')) return ket.includes('SAGU')
  if (sheet.includes('R2-BAST') || sheet.includes('RING')) return ket.includes('RING')
  if (sheet.includes('R1-BAST')) {
    return ket.includes('TBS') && !ket.includes('RING') && !ket.includes('SAGU')
  }
  return true
}

/**
 * Workbook BGA menyimpan banyak template sheet, termasuk data periode lama.
 * Sheet Prah hanya aktif bila pasangan kategori pada REKAP yang sesuai punya nilai.
 */
export function selectActivePrahSheetNames(input: {
  sheetNames: string[]
  rekapRows: RekapPrahRow[]
  rekap2Rows: RekapPrahRow[]
}): string[] {
  return input.sheetNames.filter((sheetName) => {
    const upper = sheetName.toUpperCase()
    const rows = upper.includes('2 HARGA')
      ? input.rekap2Rows
      : upper.includes('1 HARGA')
        ? input.rekapRows
        : [...input.rekapRows, ...input.rekap2Rows]
    return rows.some((row) => hasValue(row) && matchesSheet(row, sheetName))
  })
}

export function bastNumberFromFilename(fileName: string): string {
  return fileName.trim().replace(/\.(?:xlsx?|pdf|jpe?g|png|webp|heic)$/i, '').replace(/\s+/g, ' ').slice(0, 150)
}
