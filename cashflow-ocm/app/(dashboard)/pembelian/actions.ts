'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, desc, and, sum } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { pembelian, transaksiKas, akunKas, peron } from '@/lib/db/schema'
import { z } from 'zod'

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

const pembelianSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  noTid: z.string().optional(),
  kategori: z.enum(['RING 1', 'RING 2', 'BRDL']),
  peronId: z.string().min(1, 'Peron wajib diisi'),
  nopol: z.string().optional(),
  supir: z.string().optional(),
  tonase: z.coerce.number().positive('Tonase harus > 0'),
  hargaJual: z.coerce.number().positive('Harga jual harus > 0'),
  statusBayarPeron: z.enum(['belum', 'lunas']).default('belum'),
  sumberBayarId: z.string().optional(),
  catatan: z.string().optional(),
})

export async function createPembelian(formData: FormData) {
  const session = await requireSession()

  const data = pembelianSchema.parse({
    tanggal: formData.get('tanggal'),
    noTid: formData.get('noTid') || undefined,
    kategori: formData.get('kategori'),
    peronId: formData.get('peronId'),
    nopol: formData.get('nopol') || undefined,
    supir: formData.get('supir') || undefined,
    tonase: formData.get('tonase'),
    hargaJual: formData.get('hargaJual'),
    statusBayarPeron: (formData.get('statusBayarPeron') as string) || 'belum',
    sumberBayarId: formData.get('sumberBayarId') || undefined,
    catatan: formData.get('catatan') || undefined,
  })

  // Ambil keuntungan_per_kg dari peron
  const peronData = await db.query.peron.findFirst({ where: (t, { eq }) => eq(t.id, data.peronId) })
  if (!peronData) throw new Error('Peron tidak ditemukan')

  const keuntunganPerKg = peronData.keuntunganPerKg
  const hargaBeli = data.hargaJual - keuntunganPerKg
  const totalJual = data.tonase * data.hargaJual
  const totalBeli = data.tonase * hargaBeli
  const keuntungan = totalJual - totalBeli

  const inserted = await db.insert(pembelian).values({
    tanggal: data.tanggal,
    noTid: data.noTid,
    kategori: data.kategori,
    peronId: data.peronId,
    nopol: data.nopol,
    supir: data.supir,
    tonase: data.tonase,
    hargaJual: data.hargaJual,
    hargaBeli,
    totalJual,
    totalBeli,
    keuntungan,
    statusBayarPeron: data.statusBayarPeron,
    sumberBayarId: data.sumberBayarId,
    catatan: data.catatan,
    createdBy: session.user.id,
  }).returning()
  const pembelianId = inserted[0].id

  // Buat transaksi kas jika sudah lunas
  if (data.statusBayarPeron === 'lunas' && data.sumberBayarId) {
    await db.insert(transaksiKas).values({
      tanggal: data.tanggal,
      akunId: data.sumberBayarId,
      arah: 'keluar',
      jumlah: totalBeli,
      kategori: 'bayar_peron',
      refTabel: 'pembelian',
      refId: pembelianId,
      catatan: `Bayar peron ${peronData.nama}${data.noTid ? ` TID ${data.noTid}` : ''}`,
      createdBy: session.user.id,
    })
  }

  revalidatePath('/pembelian')
  return { success: true, id: pembelianId }
}

export async function updatePembelian(id: string, formData: FormData) {
  const session = await requireSession()

  const data = pembelianSchema.parse({
    tanggal: formData.get('tanggal'),
    noTid: formData.get('noTid') || undefined,
    kategori: formData.get('kategori'),
    peronId: formData.get('peronId'),
    nopol: formData.get('nopol') || undefined,
    supir: formData.get('supir') || undefined,
    tonase: formData.get('tonase'),
    hargaJual: formData.get('hargaJual'),
    statusBayarPeron: (formData.get('statusBayarPeron') as string) || 'belum',
    sumberBayarId: formData.get('sumberBayarId') || undefined,
    catatan: formData.get('catatan') || undefined,
  })

  const peronData = await db.query.peron.findFirst({ where: (t, { eq }) => eq(t.id, data.peronId) })
  if (!peronData) throw new Error('Peron tidak ditemukan')

  const keuntunganPerKg = peronData.keuntunganPerKg
  const hargaBeli = data.hargaJual - keuntunganPerKg
  const totalJual = data.tonase * data.hargaJual
  const totalBeli = data.tonase * hargaBeli
  const keuntungan = totalJual - totalBeli

  await db.update(pembelian).set({
    tanggal: data.tanggal,
    noTid: data.noTid,
    kategori: data.kategori,
    peronId: data.peronId,
    nopol: data.nopol,
    supir: data.supir,
    tonase: data.tonase,
    hargaJual: data.hargaJual,
    hargaBeli,
    totalJual,
    totalBeli,
    keuntungan,
    statusBayarPeron: data.statusBayarPeron,
    sumberBayarId: data.sumberBayarId,
    catatan: data.catatan,
  }).where(eq(pembelian.id, id))

  // Ganti transaksi kas
  await db.delete(transaksiKas).where(and(eq(transaksiKas.refTabel, 'pembelian'), eq(transaksiKas.refId, id)))
  if (data.statusBayarPeron === 'lunas' && data.sumberBayarId) {
    await db.insert(transaksiKas).values({
      tanggal: data.tanggal,
      akunId: data.sumberBayarId,
      arah: 'keluar',
      jumlah: totalBeli,
      kategori: 'bayar_peron',
      refTabel: 'pembelian',
      refId: id,
      catatan: `Bayar peron ${peronData.nama}${data.noTid ? ` TID ${data.noTid}` : ''}`,
      createdBy: session.user.id,
    })
  }

  revalidatePath('/pembelian')
  return { success: true }
}

export async function deletePembelian(id: string) {
  await requireOwner()
  await db.delete(transaksiKas).where(and(eq(transaksiKas.refTabel, 'pembelian'), eq(transaksiKas.refId, id)))
  await db.delete(pembelian).where(eq(pembelian.id, id))
  revalidatePath('/pembelian')
  return { success: true }
}

export async function getPembelianList() {
  return db.query.pembelian.findMany({
    orderBy: (p, { desc }) => [desc(p.tanggal), desc(p.createdAt)],
    with: { peron: true, sumberBayar: true, fotos: true },
  })
}

export async function getPembelianById(id: string) {
  return db.query.pembelian.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: { peron: true, sumberBayar: true },
  })
}

export async function getAkunKasList() {
  return db.select().from(akunKas).orderBy(akunKas.urutan)
}

// Dipakai form: hitung harga beli otomatis berdasarkan peron
export async function getKeuntunganPerKg(peronId: string): Promise<number> {
  const p = await db.query.peron.findFirst({ where: (t, { eq }) => eq(t.id, peronId) })
  return p?.keuntunganPerKg ?? 0
}
