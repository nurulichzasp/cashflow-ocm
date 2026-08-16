'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { peronAccess } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { logActivity } from '@/lib/audit'

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Tidak terautentikasi')
  return session
}

// Link portal = akses data peron ke pihak LUAR (tanpa login). Buat/rotate/cabut
// hanya boleh owner — bukan sekadar user login mana pun (R2).
async function requireOwner() {
  const session = await requireSession()
  if (session.user.role !== 'owner') throw new Error('Hanya owner yang dapat mengelola link portal peron')
  return session
}

function portalBase(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://omandacerli.com'
}

export type PeronAccessInfo = {
  token: string
  url: string
  isActive: boolean
  lastViewedAt: Date | null
} | null

/** Ambil status link portal peron (untuk panel admin). */
export async function getPeronAccess(peronId: string): Promise<PeronAccessInfo> {
  await requireOwner()
  const row = await db.select().from(peronAccess).where(eq(peronAccess.peronId, peronId)).limit(1)
  if (!row[0]) return null
  return {
    token: row[0].token,
    url: `${portalBase()}/p/${row[0].token}`,
    isActive: row[0].isActive,
    lastViewedAt: row[0].lastViewedAt ?? null,
  }
}

/** Buat / rotate token portal → kembalikan URL siap-bagi. */
export async function generatePeronToken(peronId: string): Promise<{ url: string }> {
  const session = await requireOwner()
  const token = randomBytes(32).toString('hex') // 64 hex char, tak bisa ditebak
  await db
    .insert(peronAccess)
    .values({ peronId, token, isActive: true })
    .onConflictDoUpdate({
      target: peronAccess.peronId,
      set: { token, isActive: true, issuedAt: new Date(), lastViewedAt: null },
    })
  await logActivity({
    userId: session.user.id,
    action: 'update',
    entityType: 'peron',
    entityId: peronId,
    description: 'Buat / rotate link portal peron',
  }).catch(() => {})
  revalidatePath(`/peron/${peronId}`)
  return { url: `${portalBase()}/p/${token}` }
}

/** Nonaktifkan link portal (langsung memutus akses). */
export async function revokePeronToken(peronId: string): Promise<void> {
  const session = await requireOwner()
  await db.update(peronAccess).set({ isActive: false }).where(eq(peronAccess.peronId, peronId))
  await logActivity({
    userId: session.user.id,
    action: 'update',
    entityType: 'peron',
    entityId: peronId,
    description: 'Nonaktifkan link portal peron',
  }).catch(() => {})
  revalidatePath(`/peron/${peronId}`)
}
