'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { pembelian, pembelianDetail, transaksiKas, akunKas, peron } from '@/lib/db/schema'
import { z } from 'zod'
import { notifyNewPembelian } from '@/lib/notification'
import { requirePermission } from '@/lib/permissions'

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Tidak terautentikasi')
  return session
}

async function requireOwner() {
  const session = await requireSession()
  if (session.user.role !== 'owner') throw new Error('Hanya owner yang dapat melakukan aksi ini')
  return session
}

export type KategoriPembelian = 'OCM R1' | 'OCM R2' | 'OCMP SAGU' | 'OCM BRDL'

export interface DetailInput {
  noTid?: string
  tonase: number
  hargaLapangan: number // harga yang dibayar ke peron
  tanggalReplas?: string // tanggal replas bongkar di PKS (opsional)
}

const pembelianSchema = z.object({
  tanggal: z.string().min(1),
  kategori: z.enum(['OCM R1', 'OCM R2', 'OCMP SAGU', 'OCM BRDL']),
  peronId: z.string().min(1),
  statusBayarPeron: z.enum(['belum', 'lunas']).default('belum'),
  sumberBayarId: z.string().optional(),
  catatan: z.string().optional(),
  details: z.array(z.object({
    noTid: z.string().optional(),
    tonase: z.number().positive(),
    hargaLapangan: z.number().positive(),
    tanggalReplas: z.string().optional(),
  })).min(1, 'Minimal 1 baris detail'),
})

function computeTotals(details: DetailInput[], keuntunganPerKg: number) {
  let totalTonase = 0, totalBeli = 0, totalJual = 0, totalKeuntungan = 0
  const computed = details.map((d, i) => {
    const hargaJual = d.hargaLapangan + keuntunganPerKg
    const subtotalBeli = d.tonase * d.hargaLapangan
    const subtotalJual = d.tonase * hargaJual
    const keuntungan = subtotalJual - subtotalBeli
    totalTonase += d.tonase
    totalBeli += subtotalBeli
    totalJual += subtotalJual
    totalKeuntungan += keuntungan
    return { ...d, hargaJual, subtotalBeli, subtotalJual, keuntungan, urutan: i }
  })
  return { computed, totalTonase, totalBeli, totalJual, totalKeuntungan }
}

export async function createPembelian(data: {
  tanggal: string
  kategori: KategoriPembelian
  peronId: string
  statusBayarPeron: 'belum' | 'lunas'
  sumberBayarId?: string
  catatan?: string
  details: DetailInput[]
}) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canCreate')
  const parsed = pembelianSchema.parse(data)

  const peronData = await db.query.peron.findFirst({ where: (t, { eq }) => eq(t.id, parsed.peronId) })
  if (!peronData) throw new Error('Peron tidak ditemukan')

  const { computed, totalTonase, totalBeli, totalJual, totalKeuntungan } = computeTotals(parsed.details, peronData.keuntunganPerKg)
  const firstDetail = computed[0]

  const inserted = await db.insert(pembelian).values({
    tanggal: parsed.tanggal,
    kategori: parsed.kategori,
    peronId: parsed.peronId,
    tonase: totalTonase,
    hargaBeli: firstDetail.hargaLapangan,
    hargaJual: firstDetail.hargaJual,
    totalBeli,
    totalJual,
    keuntungan: totalKeuntungan,
    statusBayarPeron: parsed.statusBayarPeron,
    sumberBayarId: parsed.sumberBayarId,
    catatan: parsed.catatan,
    createdBy: session.user.id,
  }).returning()
  const pembelianId = inserted[0].id

  await db.insert(pembelianDetail).values(
    computed.map((d) => ({
      pembelianId,
      noTid: d.noTid || null,
      tonase: d.tonase,
      hargaLapangan: d.hargaLapangan,
      subtotalBeli: d.subtotalBeli,
      subtotalJual: d.subtotalJual,
      keuntungan: d.keuntungan,
      urutan: d.urutan,
      tanggalReplas: d.tanggalReplas || null,
    }))
  )

  if (parsed.statusBayarPeron === 'lunas' && parsed.sumberBayarId) {
    const tids = computed.map((d) => d.noTid).filter(Boolean).join(', ')
    await db.insert(transaksiKas).values({
      tanggal: parsed.tanggal,
      akunId: parsed.sumberBayarId,
      arah: 'keluar',
      jumlah: totalBeli,
      kategori: 'bayar_peron',
      refTabel: 'pembelian',
      refId: pembelianId,
      catatan: `Bayar peron ${peronData.nama}${tids ? ` TID ${tids}` : ''}`,
      createdBy: session.user.id,
    })
  }

  // Trigger Telegram Notification (handled asynchronously so it doesn't block the UI response)
  try {
    notifyNewPembelian({
      tanggal: parsed.tanggal,
      kategori: parsed.kategori,
      peronId: parsed.peronId,
      tonase: totalTonase,
      totalBeli,
      keuntungan: totalKeuntungan,
      statusBayarPeron: parsed.statusBayarPeron,
      catatan: parsed.catatan,
      createdByName: session.user.name,
      createdByRole: session.user.role,
    })
  } catch (err) {
    console.error('Failed to trigger Telegram notification for Pembelian:', err)
  }

  revalidatePath('/pembelian')
  return { success: true, id: pembelianId }
}

export async function updatePembelian(id: string, data: {
  tanggal: string
  kategori: KategoriPembelian
  peronId: string
  statusBayarPeron: 'belum' | 'lunas'
  sumberBayarId?: string
  catatan?: string
  details: DetailInput[]
}) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canEdit')
  const parsed = pembelianSchema.parse(data)

  const peronData = await db.query.peron.findFirst({ where: (t, { eq }) => eq(t.id, parsed.peronId) })
  if (!peronData) throw new Error('Peron tidak ditemukan')

  const { computed, totalTonase, totalBeli, totalJual, totalKeuntungan } = computeTotals(parsed.details, peronData.keuntunganPerKg)
  const firstDetail = computed[0]

  await db.update(pembelian).set({
    tanggal: parsed.tanggal,
    kategori: parsed.kategori,
    peronId: parsed.peronId,
    tonase: totalTonase,
    hargaBeli: firstDetail.hargaLapangan,
    hargaJual: firstDetail.hargaJual,
    totalBeli,
    totalJual,
    keuntungan: totalKeuntungan,
    statusBayarPeron: parsed.statusBayarPeron,
    sumberBayarId: parsed.sumberBayarId,
    catatan: parsed.catatan,
  }).where(eq(pembelian.id, id))

  // Replace all details
  await db.delete(pembelianDetail).where(eq(pembelianDetail.pembelianId, id))
  await db.insert(pembelianDetail).values(
    computed.map((d) => ({
      pembelianId: id,
      noTid: d.noTid || null,
      tonase: d.tonase,
      hargaLapangan: d.hargaLapangan,
      subtotalBeli: d.subtotalBeli,
      subtotalJual: d.subtotalJual,
      keuntungan: d.keuntungan,
      urutan: d.urutan,
      tanggalReplas: d.tanggalReplas || null,
    }))
  )

  await db.delete(transaksiKas).where(and(eq(transaksiKas.refTabel, 'pembelian'), eq(transaksiKas.refId, id)))
  if (parsed.statusBayarPeron === 'lunas' && parsed.sumberBayarId) {
    const tids = computed.map((d) => d.noTid).filter(Boolean).join(', ')
    await db.insert(transaksiKas).values({
      tanggal: parsed.tanggal,
      akunId: parsed.sumberBayarId,
      arah: 'keluar',
      jumlah: totalBeli,
      kategori: 'bayar_peron',
      refTabel: 'pembelian',
      refId: id,
      catatan: `Bayar peron ${peronData.nama}${tids ? ` TID ${tids}` : ''}`,
      createdBy: session.user.id,
    })
  }

  revalidatePath('/pembelian')
  return { success: true }
}

export async function deletePembelian(id: string) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canDelete')
  await db.delete(transaksiKas).where(and(eq(transaksiKas.refTabel, 'pembelian'), eq(transaksiKas.refId, id)))
  await db.delete(pembelian).where(eq(pembelian.id, id))
  revalidatePath('/pembelian')
  return { success: true }
}

export async function getPembelianList() {
  return db.query.pembelian.findMany({
    orderBy: (p, { desc }) => [desc(p.tanggal), desc(p.createdAt)],
    with: { peron: true, sumberBayar: true, fotos: true, details: { orderBy: (d, { asc }) => [asc(d.urutan)] } },
  })
}

export async function getAkunKasList() {
  return db.select().from(akunKas).orderBy(akunKas.urutan)
}

export async function getKeuntunganPerKg(peronId: string): Promise<number> {
  const p = await db.query.peron.findFirst({ where: (t, { eq }) => eq(t.id, peronId) })
  return p?.keuntunganPerKg ?? 0
}
