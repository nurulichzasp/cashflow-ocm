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

const hargaBatchSchema = z.object({
  tanggalBerlaku: z.string().min(1, 'Tanggal wajib diisi'),
  tbs: z.coerce.number().int().positive('Harga TBS harus > 0'),
  brdlKtwm: z.coerce.number().int().positive('Harga BRDL KTWM harus > 0'),
  brdlTrym: z.coerce.number().int().positive('Harga BRDL TRYM harus > 0'),
})

/**
 * Simpan harga acuan SEMUA produk sekaligus dengan satu tanggalBerlaku (time-series:
 * BUAT baris baru per produk, jangan update yang lama). LMDM otomatis = TRYM
 * (tidak diinput manual). Transaksional — semua atau tidak sama sekali.
 */
export async function createHargaAcuanBatch(input: {
  tanggalBerlaku: string
  tbs: number
  brdlKtwm: number
  brdlTrym: number
}) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canCreate')
  const data = hargaBatchSchema.parse(input)

  const rows = [
    { produk: 'TBS' as const, hargaLapangan: data.tbs },
    { produk: 'BRDL KTWM' as const, hargaLapangan: data.brdlKtwm },
    { produk: 'BRDL TRYM' as const, hargaLapangan: data.brdlTrym },
    // LMDM selalu mirror TRYM — tidak pernah blank, tidak diinput manual.
    { produk: 'BRDL LMDM' as const, hargaLapangan: data.brdlTrym },
  ].map((r) => ({
    tanggalBerlaku: data.tanggalBerlaku,
    produk: r.produk,
    hargaLapangan: r.hargaLapangan,
    selisihJualBga: 120,
  }))

  await db.transaction(async (tx) => {
    await tx.insert(hargaAcuan).values(rows)
  })

  await logActivity({
    userId: session.user.id,
    action: 'create',
    entityType: 'harga_acuan',
    entityId: data.tanggalBerlaku,
    description: describeActivity('create', 'harga_acuan', `Semua produk • ${data.tanggalBerlaku}`),
    newValues: { tanggalBerlaku: data.tanggalBerlaku, tbs: data.tbs, brdlKtwm: data.brdlKtwm, brdlTrym: data.brdlTrym, brdlLmdm: data.brdlTrym },
  })

  revalidatePath('/harga')
  return { success: true }
}

/** Harga acuan aktif (hargaLapangan terbaru) tiap produk untuk pre-fill form gabungan. */
export async function getHargaAktifSemua(tanggal?: string): Promise<{
  tbs: number | null
  brdlKtwm: number | null
  brdlTrym: number | null
}> {
  await requireSession()
  const targetDate = tanggal || new Date().toISOString().slice(0, 10)
  const pick = async (produk: 'TBS' | 'BRDL KTWM' | 'BRDL TRYM') => {
    const rows = await db
      .select({ hargaLapangan: hargaAcuan.hargaLapangan })
      .from(hargaAcuan)
      .where(and(eq(hargaAcuan.produk, produk), lte(hargaAcuan.tanggalBerlaku, targetDate)))
      .orderBy(desc(hargaAcuan.tanggalBerlaku), desc(hargaAcuan.createdAt))
      .limit(1)
    return rows[0]?.hargaLapangan ?? null
  }
  const [tbs, brdlKtwm, brdlTrym] = await Promise.all([pick('TBS'), pick('BRDL KTWM'), pick('BRDL TRYM')])
  return { tbs, brdlKtwm, brdlTrym }
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

/** Ambil harga acuan terbaru untuk produk tertentu pada/sebelum tanggal tertentu.
 *  LMDM selalu mirror TRYM — lookup LMDM dialihkan ke TRYM agar tak pernah blank. */
export async function getHargaAktif(produk: 'TBS' | 'BRDL KTWM' | 'BRDL TRYM' | 'BRDL LMDM', tanggal: string) {
  await requireSession()
  const lookupProduk = produk === 'BRDL LMDM' ? 'BRDL TRYM' : produk
  const rows = await db
    .select()
    .from(hargaAcuan)
    .where(and(eq(hargaAcuan.produk, lookupProduk), lte(hargaAcuan.tanggalBerlaku, tanggal)))
    .orderBy(desc(hargaAcuan.tanggalBerlaku))
    .limit(1)
  return rows[0] ?? null
}
