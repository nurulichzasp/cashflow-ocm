'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, lte, desc, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { hargaAcuan, tarifPeron } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { requirePermission } from '@/lib/permissions'
import { logActivity, describeActivity } from '@/lib/audit'
import { SELISIH_JUAL_BGA } from '@/lib/harga'
import { todayString } from '@/lib/format'
import { isoDateSchema } from '@/lib/validation'

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
  tanggalBerlaku: isoDateSchema,
  produk: z.enum(['TBS', 'BRDL KTWM', 'BRDL TRYM', 'BRDL LMDM']),
  hargaLapangan: z.coerce.number().int().positive('Harga lapangan harus positif'),
  selisihJualBga: z.coerce.number().int().min(0).default(SELISIH_JUAL_BGA),
  catatan: z.string().optional(),
})

const tarifPeronSchema = z.object({
  peronId: z.string().min(1, 'Peron wajib dipilih'),
  tanggalBerlaku: isoDateSchema,
  kelebihanPerKg: z.coerce.number().int().min(0).max(SELISIH_JUAL_BGA),
  brdlSamaTbs: z.boolean(),
  catatan: z.string().trim().max(200).optional(),
})

export async function upsertTarifPeron(input: z.infer<typeof tarifPeronSchema>) {
  const session = await requireOwner()
  const data = tarifPeronSchema.parse(input)
  await db
    .insert(tarifPeron)
    .values({ ...data, catatan: data.catatan || null, createdBy: session.user.id })
    .onConflictDoUpdate({
      target: [tarifPeron.peronId, tarifPeron.tanggalBerlaku],
      set: {
        kelebihanPerKg: data.kelebihanPerKg,
        brdlSamaTbs: data.brdlSamaTbs,
        catatan: data.catatan || null,
        createdBy: session.user.id,
        createdAt: new Date(),
      },
    })
  await logActivity({
    userId: session.user.id,
    action: 'update',
    entityType: 'tarif_peron',
    entityId: `${data.peronId}:${data.tanggalBerlaku}`,
    description: `Atur kelebihan peron Rp${data.kelebihanPerKg}/kg mulai ${data.tanggalBerlaku}`,
    newValues: data,
  })
  revalidatePath('/harga')
  revalidatePath('/pembelian')
  return { success: true }
}

export async function deleteTarifPeron(id: string) {
  const session = await requireOwner()
  const [existing] = await db.select().from(tarifPeron).where(eq(tarifPeron.id, id)).limit(1)
  if (!existing) throw new Error('Tarif peron tidak ditemukan')
  await db.delete(tarifPeron).where(eq(tarifPeron.id, id))
  await logActivity({
    userId: session.user.id,
    action: 'delete',
    entityType: 'tarif_peron',
    entityId: id,
    description: `Hapus jadwal kelebihan peron ${existing.tanggalBerlaku}`,
    oldValues: existing,
  })
  revalidatePath('/harga')
  revalidatePath('/pembelian')
  return { success: true }
}

export async function getTarifPeronList() {
  await requireSession()
  return db.query.tarifPeron.findMany({
    orderBy: (t, { desc }) => [desc(t.tanggalBerlaku), desc(t.createdAt)],
    with: { peron: true },
  })
}

export async function createHargaAcuan(formData: FormData) {
  const session = await requireSession()
  requirePermission(session.user.role, 'canCreate')
  const data = hargaSchema.parse({
    tanggalBerlaku: formData.get('tanggalBerlaku'),
    produk: formData.get('produk'),
    hargaLapangan: formData.get('hargaLapangan'),
    selisihJualBga: SELISIH_JUAL_BGA,
    catatan: formData.get('catatan') || undefined,
  })

  await db.insert(hargaAcuan).values(data)

  // Jejak audit: harga acuan menggerakkan pricing pembelian/penjualan — konsisten
  // dengan createHargaAcuanBatch & deleteHargaAcuan yang juga mencatat.
  await logActivity({
    userId: session.user.id,
    action: 'create',
    entityType: 'harga_acuan',
    entityId: data.tanggalBerlaku,
    description: describeActivity('create', 'harga_acuan', `${data.produk} • Rp${data.hargaLapangan} (${data.tanggalBerlaku})`),
    newValues: { produk: data.produk, hargaLapangan: data.hargaLapangan, tanggalBerlaku: data.tanggalBerlaku, selisihJualBga: data.selisihJualBga },
  })

  revalidatePath('/harga')
  return { success: true }
}

const hargaBatchSchema = z.object({
  tanggalBerlaku: isoDateSchema,
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
  requirePermission(session.user.role, 'canCreate')
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
    selisihJualBga: SELISIH_JUAL_BGA,
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
  const targetDate = tanggal || todayString()
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
