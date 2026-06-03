'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { biayaFoto } from '@/lib/db/schema'

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Tidak terautentikasi')
  return session
}

export async function saveBiayaFotos(biayaId: string, urls: string[]) {
  await requireSession()
  if (urls.length === 0) return

  await db.insert(biayaFoto).values(
    urls.map((url) => ({ biayaId, url }))
  )
  revalidatePath('/biaya')
}

export async function getBiayaFotos(biayaId: string) {
  return db.query.biayaFoto.findMany({
    where: (t, { eq }) => eq(t.biayaId, biayaId),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  })
}
