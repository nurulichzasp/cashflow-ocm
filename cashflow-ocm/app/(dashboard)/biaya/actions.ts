'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, sum, count } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { biayaOperasional, transaksiKas, biayaFoto } from '@/lib/db/schema'
import { and } from 'drizzle-orm'
import { LIST_PAGE_SIZE } from '@/lib/pagination'
import { z } from 'zod'
import { notifyNewBiaya } from '@/lib/notification'
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

const biayaSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  kategori: z.enum(['gaji', 'solar', 'transport', 'lainnya']),
  kategoriLain: z.string().optional(),
  jumlah: z.coerce.number().int().positive('Jumlah harus positif'),
  akunSumberId: z.string().min(1, 'Akun sumber wajib dipilih'),
  catatan: z.string().optional(),
}).refine((d) => d.kategori !== 'lainnya' || !!d.kategoriLain?.trim(), {
  message: 'Sebutkan kategori untuk "Lainnya"',
  path: ['kategoriLain'],
})

/** kategori_lain hanya disimpan saat kategori = 'lainnya'; selain itu null. */
function resolveKategoriLain(kategori: string, kategoriLain?: string): string | null {
  return kategori === 'lainnya' ? (kategoriLain?.trim() || null) : null
}

/** Label kategori untuk catatan kas/audit (pakai nama custom bila 'lainnya'). */
function labelKategori(kategori: string, kategoriLain?: string | null): string {
  return kategori === 'lainnya' && kategoriLain?.trim() ? kategoriLain.trim() : kategori
}

export async function createBiayaOperasional(formData: FormData) {
  const session = await requireSession()
  requirePermission(session.user.role, 'canCreate')

  const data = biayaSchema.parse({
    tanggal: formData.get('tanggal'),
    kategori: formData.get('kategori'),
    kategoriLain: formData.get('kategoriLain') || undefined,
    jumlah: formData.get('jumlah'),
    akunSumberId: formData.get('akunSumberId'),
    catatan: formData.get('catatan') || undefined,
  })
  const kategoriLain = resolveKategoriLain(data.kategori, data.kategoriLain)

  // Foto nota dikirim sebagai JSON array string lewat FormData
  const fotoUrls: string[] = (() => {
    const raw = formData.get('fotoUrls')
    if (typeof raw !== 'string' || !raw) return []
    try {
      const arr = JSON.parse(raw)
      return Array.isArray(arr) ? arr.filter((u): u is string => typeof u === 'string') : []
    } catch {
      return []
    }
  })()
  const idempotencyKey = formData.get('idempotencyKey')?.toString() || undefined

  // Anti-dobel: tolak biaya identik dari user yang sama dalam ~60 detik terakhir.
  const recentCutoff = new Date(Date.now() - 60_000)
  const dupBiaya = await db.query.biayaOperasional.findFirst({
    where: (t, { and, eq, gte }) => and(
      eq(t.createdBy, session.user.id),
      eq(t.tanggal, data.tanggal),
      eq(t.akunSumberId, data.akunSumberId),
      eq(t.jumlah, data.jumlah),
      eq(t.kategori, data.kategori),
      gte(t.createdAt, recentCutoff),
    ),
  })
  if (dupBiaya) throw new Error('Biaya identik baru saja tercatat (~1 menit lalu). Bila berbeda, ubah sedikit (mis. catatan) lalu simpan lagi.')

  // Atomic: catat biaya + mutasi kas (uang keluar) + foto sekaligus
  const inserted = await db.transaction(async (tx) => {
    const ins = await tx.insert(biayaOperasional).values({
      tanggal: data.tanggal,
      kategori: data.kategori,
      kategoriLain,
      jumlah: data.jumlah,
      akunSumberId: data.akunSumberId,
      catatan: data.catatan,
      createdBy: session.user.id,
      idempotencyKey,
    }).onConflictDoNothing({ target: biayaOperasional.idempotencyKey }).returning()
    if (ins.length === 0) throw new Error('Biaya ini sudah tercatat (pengiriman ganda terdeteksi). Cek daftar, jangan input ulang.')

    await tx.insert(transaksiKas).values({
      tanggal: data.tanggal,
      akunId: data.akunSumberId,
      arah: 'keluar',
      jumlah: data.jumlah,
      kategori: 'biaya_operasional',
      refTabel: 'biaya_operasional',
      refId: ins[0].id,
      idempotencyKey: `biaya_operasional:${ins[0].id}`,
      catatan: `Biaya ${labelKategori(data.kategori, kategoriLain)}${data.catatan ? `: ${data.catatan}` : ''}`,
      createdBy: session.user.id,
    })

    if (fotoUrls.length > 0) {
      await tx.insert(biayaFoto).values(fotoUrls.map((url) => ({ biayaId: ins[0].id, url })))
    }

    return ins
  })

  await logActivity({
    userId: session.user.id,
    action: 'create',
    entityType: 'biaya_operasional',
    entityId: inserted[0]?.id,
    description: describeActivity('create', 'biaya_operasional', `${data.kategori} • Rp${data.jumlah}`),
    newValues: { tanggal: data.tanggal, kategori: data.kategori, jumlah: data.jumlah, akunSumberId: data.akunSumberId },
  })

  // Trigger Telegram Notification
  try {
    await notifyNewBiaya({
      tanggal: data.tanggal,
      kategori: labelKategori(data.kategori, kategoriLain),
      jumlah: data.jumlah,
      catatan: data.catatan,
      createdByName: session.user.name,
      createdByRole: session.user.role,
    })
  } catch (err) {
    console.error('Failed to trigger Telegram notification for Biaya:', err)
  }

  revalidatePath('/biaya')
  return { success: true, id: inserted[0].id }
}

export async function updateBiayaOperasional(id: string, formData: FormData) {
  const session = await requireSession()
  requirePermission(session.user.role, 'canEdit')

  const data = biayaSchema.parse({
    tanggal: formData.get('tanggal'),
    kategori: formData.get('kategori'),
    kategoriLain: formData.get('kategoriLain') || undefined,
    jumlah: formData.get('jumlah'),
    akunSumberId: formData.get('akunSumberId'),
    catatan: formData.get('catatan') || undefined,
  })
  const kategoriLain = resolveKategoriLain(data.kategori, data.kategoriLain)

  // Foto nota dikirim sebagai JSON array string lewat FormData
  const fotoUrls: string[] = (() => {
    const raw = formData.get('fotoUrls')
    if (typeof raw !== 'string' || !raw) return []
    try {
      const arr = JSON.parse(raw)
      return Array.isArray(arr) ? arr.filter((u): u is string => typeof u === 'string') : []
    } catch {
      return []
    }
  })()

  const existing = await db.query.biayaOperasional.findFirst({ where: (t, { eq }) => eq(t.id, id) })
  if (!existing) throw new Error('Biaya tidak ditemukan')

  await db.transaction(async (tx) => {
    await tx.update(biayaOperasional).set({
      tanggal: data.tanggal,
      kategori: data.kategori,
      kategoriLain,
      jumlah: data.jumlah,
      akunSumberId: data.akunSumberId,
      catatan: data.catatan ?? null,
    }).where(eq(biayaOperasional.id, id))

    // Sinkronkan kas: hapus mutasi lama, buat ulang (uang keluar)
    await tx.delete(transaksiKas).where(and(eq(transaksiKas.refTabel, 'biaya_operasional'), eq(transaksiKas.refId, id)))
    await tx.insert(transaksiKas).values({
      tanggal: data.tanggal,
      akunId: data.akunSumberId,
      arah: 'keluar',
      jumlah: data.jumlah,
      kategori: 'biaya_operasional',
      refTabel: 'biaya_operasional',
      refId: id,
      idempotencyKey: `biaya_operasional:${id}`,
      catatan: `Biaya ${labelKategori(data.kategori, kategoriLain)}${data.catatan ? `: ${data.catatan}` : ''}`,
      createdBy: session.user.id,
    })

    // Sinkronkan foto: hapus lama, buat ulang
    await tx.delete(biayaFoto).where(eq(biayaFoto.biayaId, id))
    if (fotoUrls.length > 0) {
      await tx.insert(biayaFoto).values(fotoUrls.map((url) => ({ biayaId: id, url })))
    }
  })

  await logActivity({
    userId: session.user.id,
    action: 'update',
    entityType: 'biaya_operasional',
    entityId: id,
    description: describeActivity('update', 'biaya_operasional', `${data.kategori} • Rp${data.jumlah}`),
    oldValues: { tanggal: existing.tanggal, kategori: existing.kategori, jumlah: existing.jumlah, akunSumberId: existing.akunSumberId, catatan: existing.catatan },
    newValues: { tanggal: data.tanggal, kategori: data.kategori, jumlah: data.jumlah, akunSumberId: data.akunSumberId, catatan: data.catatan ?? null },
  })

  revalidatePath('/biaya')
  revalidatePath('/kas')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteBiayaOperasional(id: string) {
  // Hapus data keuangan = OWNER-ONLY (diseragamkan 15 Jun 2026; sebelumnya
  // canDelete = owner+admin). Konsisten dengan penjualan/kas/peron.
  const session = await requireOwner()

  const existing = await db.query.biayaOperasional.findFirst({ where: (t, { eq }) => eq(t.id, id) })

  await db.transaction(async (tx) => {
    await tx.delete(transaksiKas).where(and(eq(transaksiKas.refTabel, 'biaya_operasional'), eq(transaksiKas.refId, id)))
    // W9: hapus foto EKSPLISIT (FK cascade OFF di Turso/libSQL → cegah orphan)
    await tx.delete(biayaFoto).where(eq(biayaFoto.biayaId, id))
    await tx.delete(biayaOperasional).where(eq(biayaOperasional.id, id))
  })

  await logActivity({
    userId: session.user.id,
    action: 'delete',
    entityType: 'biaya_operasional',
    entityId: id,
    description: describeActivity('delete', 'biaya_operasional', existing ? `${existing.kategori} • Rp${existing.jumlah}` : id),
    oldValues: existing
      ? { tanggal: existing.tanggal, kategori: existing.kategori, jumlah: existing.jumlah, akunSumberId: existing.akunSumberId }
      : undefined,
  })

  revalidatePath('/biaya')
  revalidatePath('/kas')
  revalidatePath('/dashboard')
  return { success: true }
}

// Paginasi window (pola kas): tanpa filter → hanya LIST_PAGE_SIZE baris terbaru
// (offset utk "Muat lebih banyak"); dengan filter tanggal → SEMUA baris rentang
// itu (bounded), supaya ringkasan/agregat klien atas rentang tetap persis benar.
export async function getBiayaList(opts?: {
  dari?: string
  sampai?: string
  offset?: number
  limit?: number
}) {
  await requireSession()
  const { dari, sampai, offset, limit } = opts ?? {}
  const ranged = Boolean(dari || sampai)
  return db.query.biayaOperasional.findMany({
    where: ranged
      ? (b, { and, gte, lte }) =>
          and(
            ...(dari ? [gte(b.tanggal, dari)] : []),
            ...(sampai ? [lte(b.tanggal, sampai)] : []),
          )
      : undefined,
    orderBy: (b, { desc }) => [desc(b.tanggal), desc(b.createdAt)],
    limit: ranged ? undefined : (limit ?? LIST_PAGE_SIZE),
    offset: ranged ? undefined : (offset ?? 0),
    with: { akunSumber: true, fotos: true },
  })
}

// Agregat all-time via SQL (bukan dari baris yang dimuat klien) — total entri &
// total pengeluaran, dipakai hero + empty-state + LoadMoreBar saat tanpa filter.
export async function getBiayaStats() {
  await requireSession()
  const [row] = await db
    .select({ totalCount: count(), total: sum(biayaOperasional.jumlah) })
    .from(biayaOperasional)
  // sum() drizzle mengembalikan string|null → normalkan ke number.
  return { totalCount: row?.totalCount ?? 0, totalBiaya: Number(row?.total ?? 0) }
}
