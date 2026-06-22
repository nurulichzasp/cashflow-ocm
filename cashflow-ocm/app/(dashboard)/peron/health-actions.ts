'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, desc, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { peron, peronHealth, peronSnapshot, peronFollowup } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { rebuildPeronHealth } from '@/lib/peron-health/rebuild'
import { logActivity } from '@/lib/audit'
import { requirePermission } from '@/lib/permissions'

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Tidak terautentikasi')
  return session
}

const STATUS_ORDER = { kritis: 0, perhatian: 1, normal: 2, data_kurang: 3 } as const

/** List semua peron + status, terurut: kritis → perhatian → normal → data_kurang, lalu share desc. */
export async function getPeronHealthList() {
  await requireSession()
  const rows = await db
    .select({
      peronId: peronHealth.peronId,
      nama: peron.nama,
      status: peronHealth.status,
      shareCurrent: peronHealth.shareCurrent,
      shareBase: peronHealth.shareBase,
      shareDelta: peronHealth.shareDelta,
      daysSinceLast: peronHealth.daysSinceLast,
      lastSetorDate: peronHealth.lastSetorDate,
      seasonVerdict: peronHealth.seasonVerdict,
      updatedAt: peronHealth.updatedAt,
    })
    .from(peronHealth)
    .innerJoin(peron, eq(peron.id, peronHealth.peronId))
    .where(eq(peronHealth.isArchived, false))

  return rows.sort((a, b) => {
    const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    return so !== 0 ? so : b.shareCurrent - a.shareCurrent
  })
}

/** Detail 1 peron: deret mingguan + stat + riwayat followup. */
export async function getPeronHealthDetail(peronId: string) {
  await requireSession()
  const [info, snaps, followups] = await Promise.all([
    db
      .select({ nama: peron.nama, health: peronHealth })
      .from(peron)
      .leftJoin(peronHealth, eq(peronHealth.peronId, peron.id))
      .where(eq(peron.id, peronId))
      .limit(1),
    db
      .select()
      .from(peronSnapshot)
      .where(eq(peronSnapshot.peronId, peronId))
      .orderBy(asc(peronSnapshot.weekStart)),
    db
      .select()
      .from(peronFollowup)
      .where(eq(peronFollowup.peronId, peronId))
      .orderBy(desc(peronFollowup.createdAt)),
  ])
  if (!info[0]) return null
  return { nama: info[0].nama, health: info[0].health, snapshots: snaps, followups }
}

/** Trigger manual rebuild dari tombol "Perbarui". */
export async function refreshPeronHealth() {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canEdit')
  const res = await rebuildPeronHealth()
  revalidatePath('/peron/kesehatan')
  return res
}

const followupSchema = z.object({
  peronId: z.string().min(1),
  triggeredStatus: z.string().min(1),
  contacted: z.boolean(),
  reason: z.enum(['harga_kalah', 'pindah_cv', 'masalah_operasional', 'memang_musim', 'lainnya']).optional().nullable(),
  note: z.string().optional().nullable(),
  outcome: z.enum(['kembali_normal', 'masih_pantau', 'hilang']).optional().nullable(),
})

export async function createFollowup(input: z.infer<typeof followupSchema>) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canEdit')
  const data = followupSchema.parse(input)
  await db.insert(peronFollowup).values({
    peronId: data.peronId,
    triggeredStatus: data.triggeredStatus,
    contacted: data.contacted,
    reason: data.reason ?? null,
    note: data.note ?? null,
    outcome: data.outcome ?? null,
    createdBy: session.user.id,
  })
  await logActivity({
    userId: session.user.id,
    action: 'create',
    entityType: 'peron',
    entityId: data.peronId,
    description: `Tindak lanjut kesehatan peron (status ${data.triggeredStatus})`,
  }).catch(() => {})
  // Outcome "hilang" → arsipkan otomatis (berhenti memicu alarm)
  if (data.outcome === 'hilang') {
    await db.update(peronHealth).set({ isArchived: true }).where(eq(peronHealth.peronId, data.peronId))
  }
  revalidatePath('/peron/kesehatan')
  revalidatePath(`/peron/kesehatan/${data.peronId}`)
}

export async function archivePeron(peronId: string) {
  const session = await requireSession()
  requirePermission(session.user.role as any, 'canEdit')
  await db.update(peronHealth).set({ isArchived: true }).where(eq(peronHealth.peronId, peronId))
  await logActivity({
    userId: session.user.id,
    action: 'update',
    entityType: 'peron',
    entityId: peronId,
    description: 'Arsipkan peron dari pemantauan kesehatan',
  }).catch(() => {})
  revalidatePath('/peron/kesehatan')
}
