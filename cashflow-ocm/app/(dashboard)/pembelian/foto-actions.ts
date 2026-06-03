'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { pembelianFoto } from '@/lib/db/schema'

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Tidak terautentikasi')
  return session
}

export async function savePembelianFotos(pembelianId: string, urls: string[]) {
  await requireSession()
  if (urls.length === 0) return

  await db.insert(pembelianFoto).values(
    urls.map((url) => ({ pembelianId, url }))
  )
  revalidatePath('/pembelian')
}

export async function replacePembelianFotos(pembelianId: string, urls: string[]) {
  await requireSession()
  await db.delete(pembelianFoto).where(eq(pembelianFoto.pembelianId, pembelianId))
  if (urls.length > 0) {
    await db.insert(pembelianFoto).values(
      urls.map((url) => ({ pembelianId, url }))
    )
  }
  revalidatePath('/pembelian')
}

export async function getPembelianFotos(pembelianId: string) {
  return db.query.pembelianFoto.findMany({
    where: (t, { eq }) => eq(t.pembelianId, pembelianId),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  })
}
