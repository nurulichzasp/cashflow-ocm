import * as XLSX from 'xlsx'
import { formatRupiah } from './format'

export type ExportFormat = 'excel' | 'csv'

interface ExportOptions {
  filename: string
  sheetName?: string
  format?: ExportFormat
}

/**
 * Export data to Excel or CSV
 */
export function exportData(
  data: any[],
  options: ExportOptions
): void {
  const {
    filename,
    sheetName = 'Data',
    format = 'excel',
  } = options

  const ws = XLSX.utils.json_to_sheet(data)

  // Auto-size columns
  const columnWidths = calculateColumnWidths(data)
  ws['!cols'] = columnWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const ext = format === 'excel' ? 'xlsx' : 'csv'
  XLSX.writeFile(wb, `${filename}.${ext}`)
}

/**
 * Export pembelian data
 */
export function exportPembelian(
  pembelianList: any[],
  startDate?: string,
  endDate?: string
): void {
  const filtered = pembelianList.filter((p) => {
    if (startDate && p.tanggal < startDate) return false
    if (endDate && p.tanggal > endDate) return false
    return true
  })

  const rows = filtered.map((p) => ({
    Tanggal: p.tanggal,
    Peron: p.peron?.nama || '-',
    Kategori: p.kategori,
    Tonase: p.tonase,
    'Total Beli': `Rp ${p.totalBeli.toLocaleString('id-ID')}`,
    'Total Jual': `Rp ${p.totalJual.toLocaleString('id-ID')}`,
    Keuntungan: `Rp ${p.keuntungan.toLocaleString('id-ID')}`,
    'Status Bayar': p.statusBayarPeron === 'lunas' ? 'Lunas' : 'Belum',
    Catatan: p.catatan || '-',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Pembelian')
  XLSX.writeFile(wb, `Laporan Pembelian ${new Date().toISOString().split('T')[0]}.xlsx`)
}

/**
 * Export penjualan data
 */
export function exportPenjualan(
  penjualanList: any[],
  startDate?: string,
  endDate?: string
): void {
  const filtered = penjualanList.filter((p) => {
    if (startDate && p.tanggal < startDate) return false
    if (endDate && p.tanggal > endDate) return false
    return true
  })

  const exportData = filtered.map((p) => ({
    Tanggal: p.tanggal,
    'No. Invoice': p.noInvoice || '-',
    'No. BAST': p.noBast || '-',
    'Total Bersih': `Rp ${(p.totalBersih || 0).toLocaleString('id-ID')}`,
    'Total Nilai': `Rp ${(p.totalNilai || 0).toLocaleString('id-ID')}`,
    'Status Bayar': p.statusBayar === 'lunas' ? 'Lunas' : 'Belum',
    'Tgl Bayar BGA': p.tanggalBayarBga || '-',
    Catatan: p.catatan || '-',
  }))

  const ws = XLSX.utils.json_to_sheet(exportData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Penjualan')
  XLSX.writeFile(wb, `Laporan Penjualan ${new Date().toISOString().split('T')[0]}.xlsx`)
}

/**
 * Export laporan keuangan
 */
export function exportLaporanKeuangan(
  data: {
    periodo: string
    totalPembelian: number
    totalPenjualan: number
    totalBiaya: number
    keuntungan: number
    saldoAkhir: number
  }
): void {
  const exportData = [
    { Deskripsi: 'LAPORAN KEUANGAN', Nilai: '' },
    { Deskripsi: `Periode: ${data.periodo}`, Nilai: '' },
    { Deskripsi: '', Nilai: '' },
    { Deskripsi: 'Total Pembelian', Nilai: `Rp ${data.totalPembelian.toLocaleString('id-ID')}` },
    { Deskripsi: 'Total Penjualan', Nilai: `Rp ${data.totalPenjualan.toLocaleString('id-ID')}` },
    { Deskripsi: 'Total Biaya', Nilai: `Rp ${data.totalBiaya.toLocaleString('id-ID')}` },
    { Deskripsi: 'Keuntungan', Nilai: `Rp ${data.keuntungan.toLocaleString('id-ID')}` },
    { Deskripsi: 'Saldo Akhir', Nilai: `Rp ${data.saldoAkhir.toLocaleString('id-ID')}` },
  ]

  const ws = XLSX.utils.json_to_sheet(exportData)
  ws['!cols'] = [{ wch: 30 }, { wch: 25 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan')
  XLSX.writeFile(wb, `Laporan Keuangan ${data.periodo}.xlsx`)
}

/**
 * Calculate optimal column widths for Excel export
 */
function calculateColumnWidths(data: any[]): Array<{ wch: number }> {
  if (data.length === 0) return []

  const firstRow = data[0]
  const headers = Object.keys(firstRow)

  return headers.map((header) => {
    const maxLength = Math.max(
      header.length,
      ...data.map((row) => {
        const value = row[header]
        return String(value).length
      })
    )
    return { wch: Math.min(maxLength + 2, 50) }
  })
}

/**
 * Generate CSV from data
 */
export function generateCSV(data: any[], filename: string): void {
  const ws = XLSX.utils.json_to_sheet(data)
  const csv = XLSX.utils.sheet_to_csv(ws)

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
