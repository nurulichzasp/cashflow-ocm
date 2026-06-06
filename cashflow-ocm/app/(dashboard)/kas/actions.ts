'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { transaksiKas, akunKas } from '@/lib/db/schema'
import { z } from 'zod'
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

const kasSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  akunId: z.string().min(1, 'Akun wajib dipilih'),
  arah: z.enum(['masuk', 'keluar']),
  jumlah: z.coerce.number().positive('Jumlah harus positif'),
  kategori: z.enum([
    'penerimaan_bga',
    'tarik_bri',
    'bayar_peron',
    'modal_peron',
    'kembali_modal',
    'biaya_operasional',
    'penyesuaian',
    'lainnya',
  ]),
  catatan: z.string().optional(),
  refTabel: z.string().optional(),
  refId: z.string().optional(),
})

export async function createTransaksiKas(formData: FormData) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canCreate')

  const data = kasSchema.parse({
    tanggal: formData.get('tanggal'),
    akunId: formData.get('akunId'),
    arah: formData.get('arah'),
    jumlah: formData.get('jumlah'),
    kategori: formData.get('kategori'),
    catatan: formData.get('catatan') || undefined,
    refTabel: formData.get('refTabel') || undefined,
    refId: formData.get('refId') || undefined,
  })

  await db.insert(transaksiKas).values({
    ...data,
    createdBy: session.user.id,
  })

  revalidatePath('/kas')
  return { success: true }
}

export async function deleteTransaksiKas(id: string) {
  await requireOwner()
  await db.delete(transaksiKas).where(eq(transaksiKas.id, id))
  revalidatePath('/kas')
  return { success: true }
}

export async function getAkunKasList() {
  return db.select().from(akunKas).orderBy(akunKas.urutan)
}

export async function getKasTransactions() {
  const rows = await db.query.transaksiKas.findMany({
    orderBy: (t, { desc }) => [desc(t.tanggal), desc(t.createdAt)],
    with: { akun: true },
  })
  return rows
}
