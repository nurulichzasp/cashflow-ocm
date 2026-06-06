'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { penjualan } from '@/lib/db/schema'
import { z } from 'zod'
import { notifyNewPenjualan } from '@/lib/notification'

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

const penjualanSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  noBast: z.string().optional(),
  noInvoice: z.string().optional(),
  statusBayar: z.enum(['belum', 'lunas']).default('belum'),
  tanggalBayarBga: z.string().optional(),
  totalBersih: z.coerce.number().optional(),
  totalNilai: z.coerce.number().optional(),
  catatan: z.string().optional(),
})

function parseRpInput(v: FormDataEntryValue | null): number | undefined {
  if (!v) return undefined
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'))
  return isNaN(n) || n === 0 ? undefined : n
}

export async function createPenjualan(formData: FormData) {
  const session = await requireSession()

  const data = penjualanSchema.parse({
    tanggal: formData.get('tanggal'),
    noBast: formData.get('noBast') || undefined,
    noInvoice: formData.get('noInvoice') || undefined,
    statusBayar: formData.get('statusBayar'),
    tanggalBayarBga: formData.get('tanggalBayarBga') || undefined,
    totalBersih: parseRpInput(formData.get('totalBersih')),
    totalNilai: parseRpInput(formData.get('totalNilai')),
    catatan: formData.get('catatan') || undefined,
  })

  await db.insert(penjualan).values({
    ...data,
    createdBy: session.user.id,
  })

  // Trigger Telegram Notification
  try {
    notifyNewPenjualan({
      tanggal: data.tanggal,
      noInvoice: data.noInvoice,
      noBast: data.noBast,
      totalBersih: data.totalBersih,
      totalNilai: data.totalNilai,
      statusBayar: data.statusBayar,
      catatan: data.catatan,
      createdByName: session.user.name,
      createdByRole: session.user.role,
    })
  } catch (err) {
    console.error('Failed to trigger Telegram notification for Penjualan:', err)
  }

  revalidatePath('/penjualan')
  return { success: true }
}

export async function updatePenjualanStatus(id: string, statusBayar: 'belum' | 'lunas', tanggalBayarBga?: string) {
  await requireSession()
  await db.update(penjualan)
    .set({ statusBayar, tanggalBayarBga: tanggalBayarBga ?? null })
    .where(eq(penjualan.id, id))
  revalidatePath('/penjualan')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deletePenjualan(id: string) {
  await requireOwner()
  await db.delete(penjualan).where(eq(penjualan.id, id))
  revalidatePath('/penjualan')
  return { success: true }
}

export async function getPenjualanList() {
  return db
    .select()
    .from(penjualan)
    .orderBy(desc(penjualan.tanggal), desc(penjualan.createdAt))
}
