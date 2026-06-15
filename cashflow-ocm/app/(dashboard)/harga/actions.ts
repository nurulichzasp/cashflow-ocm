'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, lte, desc, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { hargaAcuan } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { requirePermission } from '@/lib/permissions'
import { logActivity, describeActivity } from '@/lib/audit'

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

const hargaSchema = z.object({
  tanggalBerlaku: z.string().min(1, 'Tanggal wajib diisi'),
  produk: z.enum(['TBS', 'BRDL KTWM', 'BRDL TRYM', 'BRDL LMDM']),
  hargaLapangan: z.coerce.number().positive('Harga lapangan harus positif'),
  selisihJualBga: z.coerce.number().min(0).default(120),
  catatan: z.string().optional(),
})

export async function createHargaAcuan(formData: FormData) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canCreate')
  const data = hargaSchema.parse({
    tanggalBerlaku: formData.get('tanggalBerlaku'),
    produk: formData.get('produk'),
    hargaLapangan: formData.get('hargaLapangan'),
    selisihJualBga: 120,
    catatan: formData.get('catatan') || undefined,
  })

  await db.insert(hargaAcuan).values(data)
  revalidatePath('/harga')
  return { success: true }
}

export async function deleteHargaAcuan(id: string) {
  const session = await requireOwner()
  // Jejak audit: harga acuan menggerakkan pricing pembelian/penjualan, hapusnya
  // harus tercatat (siapa & nilai apa yang dibuang).
  const [existing] = await db.select().from(hargaAcuan).where(eq(hargaAcuan.id, id)).limit(1)
  await db.delete(hargaAcuan).where(eq(hargaAcuan.id, id))
  await logActivity({
    userId: session.user.id,
    action: 'delete',
    entityType: 'harga_acuan',
    entityId: id,
    description: describeActivity(
      'delete',
      'harga_acuan',
      existing ? `${existing.produk} • Rp${existing.hargaLapangan} (${existing.tanggalBerlaku})` : id,
    ),
    oldValues: existing ?? undefined,
  })
  revalidatePath('/harga')
  return { success: true }
}

export async function getHargaList() {
  await requireSession()
  return db
    .select()
    .from(hargaAcuan)
    .orderBy(desc(hargaAcuan.tanggalBerlaku), desc(hargaAcuan.createdAt))
}

/** Ambil harga acuan terbaru untuk produk tertentu pada/sebelum tanggal tertentu */
export async function getHargaAktif(produk: 'TBS' | 'BRDL KTWM' | 'BRDL TRYM' | 'BRDL LMDM', tanggal: string) {
  await requireSession()
  const rows = await db
    .select()
    .from(hargaAcuan)
    .where(and(eq(hargaAcuan.produk, produk), lte(hargaAcuan.tanggalBerlaku, tanggal)))
    .orderBy(desc(hargaAcuan.tanggalBerlaku))
    .limit(1)
  return rows[0] ?? null
}
