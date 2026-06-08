'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { biayaOperasional, transaksiKas, biayaFoto } from '@/lib/db/schema'
import { and } from 'drizzle-orm'
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
  jumlah: z.coerce.number().positive('Jumlah harus positif'),
  akunSumberId: z.string().min(1, 'Akun sumber wajib dipilih'),
  catatan: z.string().optional(),
})

export async function createBiayaOperasional(formData: FormData) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canCreate')

  const data = biayaSchema.parse({
    tanggal: formData.get('tanggal'),
    kategori: formData.get('kategori'),
    jumlah: formData.get('jumlah'),
    akunSumberId: formData.get('akunSumberId'),
    catatan: formData.get('catatan') || undefined,
  })

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
      ...data,
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
      catatan: `Biaya ${data.kategori}${data.catatan ? `: ${data.catatan}` : ''}`,
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
    notifyNewBiaya({
      tanggal: data.tanggal,
      kategori: data.kategori,
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

export async function deleteBiayaOperasional(id: string) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canDelete')

  const existing = await db.query.biayaOperasional.findFirst({ where: (t, { eq }) => eq(t.id, id) })

  await db.transaction(async (tx) => {
    await tx.delete(transaksiKas).where(and(eq(transaksiKas.refTabel, 'biaya_operasional'), eq(transaksiKas.refId, id)))
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

export async function getBiayaList() {
  return db.query.biayaOperasional.findMany({
    orderBy: (b, { desc }) => [desc(b.tanggal), desc(b.createdAt)],
    with: { akunSumber: true, fotos: true },
  })
}
