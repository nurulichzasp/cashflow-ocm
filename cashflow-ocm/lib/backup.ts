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
  activityLog,
  pembelianDetail,
  penjualanDetail,
  pembelianFoto,
  biayaFoto,
  hargaAcuan,
  ppnBulanan,
  pphBulanan,
  appSettings,
  prahAngkutan,
  prahBbm,
} from './db/schema'

export interface BackupData {
  timestamp: string
  version: string
  tables: {
    akun_kas: (typeof akunKas.$inferSelect)[]
    peron: (typeof peron.$inferSelect)[]
    pembelian: (typeof pembelian.$inferSelect)[]
    penjualan: (typeof penjualan.$inferSelect)[]
    biaya_operasional: (typeof biayaOperasional.$inferSelect)[]
    transaksi_kas: (typeof transaksiKas.$inferSelect)[]
    modal_peron: (typeof modalPeron.$inferSelect)[]
    activity_log: (typeof activityLog.$inferSelect)[]
    // v2.0 — ditambah agar backup bisa direstore UTUH (bukan header saja):
    pembelian_detail: (typeof pembelianDetail.$inferSelect)[]
    penjualan_detail: (typeof penjualanDetail.$inferSelect)[]
    pembelian_foto: (typeof pembelianFoto.$inferSelect)[]
    biaya_foto: (typeof biayaFoto.$inferSelect)[]
    harga_acuan: (typeof hargaAcuan.$inferSelect)[]
    ppn_bulanan: (typeof ppnBulanan.$inferSelect)[]
    pph_bulanan: (typeof pphBulanan.$inferSelect)[]
    app_settings: (typeof appSettings.$inferSelect)[]
    prah_angkutan: (typeof prahAngkutan.$inferSelect)[]
    prah_bbm: (typeof prahBbm.$inferSelect)[]
  }
  summary: {
    totalPembelian: number
    totalPenjualan: number
    totalBiaya: number
    totalTransaksi: number
    totalAkun: number
    totalPeron: number
    totalPrah: number
    totalIsiBbmPrah: number
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
      pembelianDetailList,
      penjualanDetailList,
      pembelianFotoList,
      biayaFotoList,
      hargaList,
      ppnList,
      pphList,
      appSettingsList,
      prahAngkutanList,
      prahBbmList,
    ] = await Promise.all([
      db.select().from(akunKas),
      db.select().from(peron),
      db.select().from(pembelian),
      db.select().from(penjualan),
      db.select().from(biayaOperasional),
      db.select().from(transaksiKas),
      db.select().from(modalPeron),
      db.select().from(activityLog),
      db.select().from(pembelianDetail),
      db.select().from(penjualanDetail),
      db.select().from(pembelianFoto),
      db.select().from(biayaFoto),
      db.select().from(hargaAcuan),
      db.select().from(ppnBulanan),
      db.select().from(pphBulanan),
      db.select().from(appSettings),
      db.select().from(prahAngkutan),
      db.select().from(prahBbm),
    ])

    const backup: BackupData = {
      timestamp: new Date().toISOString(),
      // v2.1: backup LENGKAP (termasuk detail/foto/harga/pajak/Prah Trek) agar
      // bisa direstore utuh. Backup v1.0 lama (header-saja) tetap bisa dibaca restore.
      version: '2.1',
      tables: {
        akun_kas: akunList,
        peron: peronList,
        pembelian: pembelianList,
        penjualan: penjualanList,
        biaya_operasional: biayaList,
        transaksi_kas: transaksiList,
        modal_peron: modalList,
        activity_log: activityList,
        pembelian_detail: pembelianDetailList,
        penjualan_detail: penjualanDetailList,
        pembelian_foto: pembelianFotoList,
        biaya_foto: biayaFotoList,
        harga_acuan: hargaList,
        ppn_bulanan: ppnList,
        pph_bulanan: pphList,
        app_settings: appSettingsList,
        prah_angkutan: prahAngkutanList,
        prah_bbm: prahBbmList,
      },
      summary: {
        totalPembelian: pembelianList.length,
        totalPenjualan: penjualanList.length,
        totalBiaya: biayaList.length,
        totalTransaksi: transaksiList.length,
        totalAkun: akunList.length,
        totalPeron: peronList.length,
        totalPrah: prahAngkutanList.length,
        totalIsiBbmPrah: prahBbmList.length,
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
    { Keterangan: 'Total Prah Trek', Nilai: backup.summary.totalPrah },
    { Keterangan: 'Total Pengisian BBM Prah', Nilai: backup.summary.totalIsiBbmPrah },
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
