'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { biayaOperasional } from '@/lib/db/schema'
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

const biayaSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  kategori: z.enum(['gaji', 'solar', 'transport', 'lainnya']),
  jumlah: z.coerce.number().positive('Jumlah harus positif'),
  akunSumberId: z.string().min(1, 'Akun sumber wajib dipilih'),
  catatan: z.string().optional(),
})

export async function createBiayaOperasional(formData: FormData) {
  const session = await requireSession()

  const data = biayaSchema.parse({
    tanggal: formData.get('tanggal'),
    kategori: formData.get('kategori'),
    jumlah: formData.get('jumlah'),
    akunSumberId: formData.get('akunSumberId'),
    catatan: formData.get('catatan') || undefined,
  })

  const inserted = await db.insert(biayaOperasional).values({
    ...data,
    createdBy: session.user.id,
  }).returning()

  revalidatePath('/biaya')
  return { success: true, id: inserted[0].id }
}

export async function deleteBiayaOperasional(id: string) {
  await requireOwner()
  await db.delete(biayaOperasional).where(eq(biayaOperasional.id, id))
  revalidatePath('/biaya')
  return { success: true }
}

export async function getBiayaList() {
  return db.query.biayaOperasional.findMany({
    orderBy: (b, { desc }) => [desc(b.tanggal), desc(b.createdAt)],
    with: { akunSumber: true, fotos: true },
  })
}
