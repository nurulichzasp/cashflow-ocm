'use server'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { pembelian, penjualan, biayaOperasional, transaksiKas } from '@/lib/db/schema'
import { gte, lte } from 'drizzle-orm'
import { logActivity } from '@/lib/audit'

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Tidak terautentikasi')
  return session
}

/**
 * Export pembelian data to JSON for client-side Excel export
 */
export async function exportPembelianData(startDate?: string, endDate?: string) {
  const session = await requireSession()

  // Log export activity
  await logActivity({
    userId: session.user.id,
    action: 'export',
    entityType: 'pembelian',
    description: `Export pembelian data dari ${startDate || 'awal'} hingga ${endDate || 'akhir'}`,
  })

  const filters: ReturnType<typeof gte>[] = []
  if (startDate) filters.push(gte(pembelian.tanggal, startDate))
  if (endDate) filters.push(lte(pembelian.tanggal, endDate))

  const data = await db.query.pembelian.findMany({
    where: filters.length > 0 ? (p, { and }) => and(...filters) : undefined,
    with: { peron: true, createdByUser: true },
    orderBy: (p, { desc }) => [desc(p.tanggal)],
  })

  return data.map((p) => ({
    Tanggal: p.tanggal,
    Peron: p.peron?.nama || '-',
    Kategori: p.kategori,
    Tonase: p.tonase,
    'Total Beli': p.totalBeli,
    'Total Jual': p.totalJual,
    Keuntungan: p.keuntungan,
    'Status Bayar': p.statusBayarPeron,
    'Dibuat Oleh': p.createdByUser?.name || '-',
    Catatan: p.catatan || '-',
  }))
}

/**
 * Export penjualan data to JSON for client-side Excel export
 */
export async function exportPenjualanData(startDate?: string, endDate?: string) {
  const session = await requireSession()

  // Log export activity
  await logActivity({
    userId: session.user.id,
    action: 'export',
    entityType: 'penjualan',
    description: `Export penjualan data dari ${startDate || 'awal'} hingga ${endDate || 'akhir'}`,
  })

  const filters: ReturnType<typeof gte>[] = []
  if (startDate) filters.push(gte(penjualan.tanggal, startDate))
  if (endDate) filters.push(lte(penjualan.tanggal, endDate))

  const data = await db.query.penjualan.findMany({
    where: filters.length > 0 ? (p, { and }) => and(...filters) : undefined,
    with: { createdByUser: true },
    orderBy: (p, { desc }) => [desc(p.tanggal)],
  })

  return data.map((p) => ({
    Tanggal: p.tanggal,
    'No. Invoice': p.noInvoice || '-',
    'No. BAST': p.noBast || '-',
    'Total Bersih': p.totalBersih || 0,
    'Total Nilai': p.totalNilai || 0,
    'Status Bayar': p.statusBayar,
    'Tgl Bayar BGA': p.tanggalBayarBga || '-',
    'Dibuat Oleh': p.createdByUser?.name || '-',
    Catatan: p.catatan || '-',
  }))
}

/**
 * Export biaya operasional data
 */
export async function exportBiayaData(startDate?: string, endDate?: string) {
  const session = await requireSession()

  await logActivity({
    userId: session.user.id,
    action: 'export',
    entityType: 'biaya_operasional',
    description: `Export biaya operasional dari ${startDate || 'awal'} hingga ${endDate || 'akhir'}`,
  })

  const filters: ReturnType<typeof gte>[] = []
  if (startDate) filters.push(gte(biayaOperasional.tanggal, startDate))
  if (endDate) filters.push(lte(biayaOperasional.tanggal, endDate))

  const data = await db.query.biayaOperasional.findMany({
    where: filters.length > 0 ? (b, { and }) => and(...filters) : undefined,
    with: { akunSumber: true, createdByUser: true },
    orderBy: (b, { desc }) => [desc(b.tanggal)],
  })

  return data.map((b) => ({
    Tanggal: b.tanggal,
    Kategori: b.kategori,
    Jumlah: b.jumlah,
    'Akun Sumber': b.akunSumber?.nama || '-',
    'Dibuat Oleh': b.createdByUser?.name || '-',
    Catatan: b.catatan || '-',
  }))
}

/**
 * Get summary statistics for export
 */
export async function getExportSummary(startDate?: string, endDate?: string) {
  const session = await requireSession()

  const allPembelian = await db.query.pembelian.findMany({
    where:
      startDate && endDate
        ? (p, { and, gte, lte }) =>
            and(gte(p.tanggal, startDate), lte(p.tanggal, endDate))
        : undefined,
  })

  const allPenjualan = await db.query.penjualan.findMany({
    where:
      startDate && endDate
        ? (p, { and, gte, lte }) =>
            and(gte(p.tanggal, startDate), lte(p.tanggal, endDate))
        : undefined,
  })

  const allBiaya = await db.query.biayaOperasional.findMany({
    where:
      startDate && endDate
        ? (b, { and, gte, lte }) =>
            and(gte(b.tanggal, startDate), lte(b.tanggal, endDate))
        : undefined,
  })

  return {
    periode: `${startDate || 'Awal'} s/d ${endDate || 'Akhir'}`,
    totalPembelian: allPembelian.reduce((sum, p) => sum + p.totalBeli, 0),
    totalPenjualan: allPenjualan.reduce((sum, p) => sum + (p.totalBersih || 0), 0),
    totalBiaya: allBiaya.reduce((sum, b) => sum + b.jumlah, 0),
    keuntungan: allPembelian.reduce((sum, p) => sum + p.keuntungan, 0),
  }
}
