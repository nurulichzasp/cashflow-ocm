import { db } from './db'
import * as XLSX from 'xlsx'
import {
  pembelian,
  penjualan,
  biayaOperasional,
  transaksiKas,
  peron,
  akunKas,
  modalPeron,
  user,
  activityLog,
} from './db/schema'

export interface BackupData {
  timestamp: string
  version: string
  tables: {
    akun_kas: any[]
    peron: any[]
    pembelian: any[]
    penjualan: any[]
    biaya_operasional: any[]
    transaksi_kas: any[]
    modal_peron: any[]
    activity_log: any[]
  }
  summary: {
    totalPembelian: number
    totalPenjualan: number
    totalBiaya: number
    totalTransaksi: number
    totalAkun: number
    totalPeron: number
  }
}

/**
 * Create database backup
 */
export async function createBackup(): Promise<BackupData> {
  try {
    const [
      akunList,
      peronList,
      pembelianList,
      penjualanList,
      biayaList,
      transaksiList,
      modalList,
      activityList,
    ] = await Promise.all([
      db.select().from(akunKas),
      db.select().from(peron),
      db.select().from(pembelian),
      db.select().from(penjualan),
      db.select().from(biayaOperasional),
      db.select().from(transaksiKas),
      db.select().from(modalPeron),
      db.select().from(activityLog),
    ])

    const backup: BackupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      tables: {
        akun_kas: akunList,
        peron: peronList,
        pembelian: pembelianList,
        penjualan: penjualanList,
        biaya_operasional: biayaList,
        transaksi_kas: transaksiList,
        modal_peron: modalList,
        activity_log: activityList,
      },
      summary: {
        totalPembelian: pembelianList.length,
        totalPenjualan: penjualanList.length,
        totalBiaya: biayaList.length,
        totalTransaksi: transaksiList.length,
        totalAkun: akunList.length,
        totalPeron: peronList.length,
      },
    }

    return backup
  } catch (error) {
    console.error('Backup failed:', error)
    throw new Error('Failed to create backup')
  }
}

/**
 * Export backup to Excel file
 */
export function exportBackupToExcel(backup: BackupData): Blob {
  const wb = XLSX.utils.book_new()

  // Summary sheet
  const summaryData = [
    { Keterangan: 'Waktu Backup', Nilai: backup.timestamp },
    { Keterangan: 'Versi Database', Nilai: backup.version },
    { Keterangan: '', Nilai: '' },
    { Keterangan: 'Total Pembelian', Nilai: backup.summary.totalPembelian },
    { Keterangan: 'Total Penjualan', Nilai: backup.summary.totalPenjualan },
    { Keterangan: 'Total Biaya', Nilai: backup.summary.totalBiaya },
    { Keterangan: 'Total Transaksi', Nilai: backup.summary.totalTransaksi },
    { Keterangan: 'Total Akun', Nilai: backup.summary.totalAkun },
    { Keterangan: 'Total Peron', Nilai: backup.summary.totalPeron },
  ]

  const summarySheet = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  // Data sheets
  Object.entries(backup.tables).forEach(([tableName, data]) => {
    if (data.length > 0) {
      const sheet = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, sheet, tableName.slice(0, 31)) // Sheet name max 31 chars
    }
  })

  // Convert to blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

/**
 * Export backup as JSON
 */
export function exportBackupToJSON(backup: BackupData): string {
  return JSON.stringify(backup, null, 2)
}

/**
 * Format backup filename with timestamp
 */
export function getBackupFilename(format: 'xlsx' | 'json' = 'xlsx'): string {
  const date = new Date().toISOString().split('T')[0]
  const time = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '')
  return `cashflow-backup-${date}-${time}.${format}`
}
