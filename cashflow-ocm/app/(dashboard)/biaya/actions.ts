'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { biayaOperasional, transaksiKas } from '@/lib/db/schema'
import { and } from 'drizzle-orm'
import { z } from 'zod'
import { notifyNewBiaya } from '@/lib/notification'
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

  // Atomic: catat biaya + mutasi kas (uang keluar) sekaligus
  const inserted = await db.transaction(async (tx) => {
    const ins = await tx.insert(biayaOperasional).values({
      ...data,
      createdBy: session.user.id,
    }).returning()

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

    return ins
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
  await db.transaction(async (tx) => {
    await tx.delete(transaksiKas).where(and(eq(transaksiKas.refTabel, 'biaya_operasional'), eq(transaksiKas.refId, id)))
    await tx.delete(biayaOperasional).where(eq(biayaOperasional.id, id))
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
