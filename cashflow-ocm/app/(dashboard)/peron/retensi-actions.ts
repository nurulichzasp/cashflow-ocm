'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, lte, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { peron, peronHealth, peronSnapshot, peronAncaman, appSettings, hargaAcuan, user } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/audit'
import { todayString } from '@/lib/format'
import {
  labaBerisiko,
  isPeronUmum,
  isProdukTBSName,
  hitungPertahanan,
  RETENSI_DEFAULTS,
  type RetensiSettings,
} from '@/lib/retensi'

// ─── Sesi & guard ────────────────────────────────────────────────────────────

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Tidak terautentikasi')
  return session
}

async function requireOwner() {
  const session = await requireSession()
  if (session.user.role !== 'owner') throw new Error('Hanya owner yang dapat mengubah margin peron')
  return session
}

function parseIntOr(v: string | null | undefined, fallback: number): number {
  const n = parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? n : fallback
}

// ─── Pengaturan retensi (app_settings + fallback default) ────────────────────

const KEY_AMBANG = 'retention_loyalty_threshold'
const KEY_MIN_TBS = 'retention_min_margin_tbs'

async function readRetensiSettings(): Promise<RetensiSettings> {
  const rows = await db.select().from(appSettings).where(inArray(appSettings.key, [KEY_AMBANG, KEY_MIN_TBS]))
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value
  return {
    ambang: parseIntOr(map[KEY_AMBANG], RETENSI_DEFAULTS.ambang),
    minMarginTbs: parseIntOr(map[KEY_MIN_TBS], RETENSI_DEFAULTS.minMarginTbs),
  }
}

/** Baca pengaturan retensi (terautentikasi). */
export async function getRetensiSettings(): Promise<RetensiSettings> {
  await requireSession()
  return readRetensiSettings()
}

/** Simpan pengaturan retensi. Owner-only. */
export async function setRetensiSettings(input: { ambang: number; minMarginTbs: number }) {
  await requireOwner()
  const data = z
    .object({ ambang: z.coerce.number().int().min(0).max(120), minMarginTbs: z.coerce.number().int().min(0).max(120) })
    .parse(input)
  const now = new Date()
  for (const [key, value] of [[KEY_AMBANG, String(data.ambang)], [KEY_MIN_TBS, String(data.minMarginTbs)]] as const) {
    await db
      .insert(appSettings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: now } })
  }
  // (setAppSettings pola app tak me-log activity; entityType audit tak mencakup settings)
  revalidatePath('/pengaturan/retensi')
  revalidatePath('/peron/kesehatan')
  return { success: true }
}

// ─── Harga acuan aktif per produk (LMDM mirror TRYM) ─────────────────────────

export type AcuanMap = { TBS: number | null; 'BRDL KTWM': number | null; 'BRDL TRYM': number | null; 'BRDL LMDM': number | null }

async function readAcuanMap(tanggal: string): Promise<AcuanMap> {
  const pick = async (produk: 'TBS' | 'BRDL KTWM' | 'BRDL TRYM') => {
    const rows = await db
      .select({ hargaLapangan: hargaAcuan.hargaLapangan })
      .from(hargaAcuan)
      .where(and(eq(hargaAcuan.produk, produk), lte(hargaAcuan.tanggalBerlaku, tanggal)))
      .orderBy(desc(hargaAcuan.tanggalBerlaku), desc(hargaAcuan.createdAt))
      .limit(1)
    return rows[0]?.hargaLapangan ?? null
  }
  const [tbs, ktwm, trym] = await Promise.all([pick('TBS'), pick('BRDL KTWM'), pick('BRDL TRYM')])
  return { TBS: tbs, 'BRDL KTWM': ktwm, 'BRDL TRYM': trym, 'BRDL LMDM': trym }
}

// ─── Volume acuan = tonase minggu operasional terakhir per peron ─────────────

async function readLatestVolume(peronIds: string[]): Promise<Record<string, number>> {
  if (peronIds.length === 0) return {}
  const rows = await db
    .select({
      peronId: peronSnapshot.peronId,
      weekStart: peronSnapshot.weekStart,
      totalKg: peronSnapshot.totalKg,
      isOperationalWeek: peronSnapshot.isOperationalWeek,
    })
    .from(peronSnapshot)
    .where(inArray(peronSnapshot.peronId, peronIds))
    .orderBy(desc(peronSnapshot.weekStart))
  const out: Record<string, number> = {}
  for (const r of rows) {
    if (out[r.peronId] != null) continue // sudah ambil minggu terbaru
    if (!r.isOperationalWeek) continue // lewati minggu non-operasional (libur)
    out[r.peronId] = r.totalKg
  }
  return out
}

// ─── Cockpit list (union health perhatian/kritis ∪ ancaman terbuka) ──────────

export interface RetensiRow {
  peronId: string
  nama: string
  keuntunganPerKg: number
  healthStatus: 'perhatian' | 'kritis' | null
  hasOpenAncaman: boolean
  volume: number | null
  labaRisiko: number | null
  latestAncaman: { produk: string; hargaKompetitor: number; hargaAcuanSaat: number; gap: number; tanggal: string } | null
}

export interface RetensiCockpit {
  settings: RetensiSettings
  acuanMap: AcuanMap
  volumeLabel: string
  rows: RetensiRow[]
}

export async function getRetentionCockpit(): Promise<RetensiCockpit> {
  const session = await requireSession()
  requirePermission(session.user.role, 'canViewFinance')

  const [settings, acuanMap, healthRows, ancamanRows, peronAll] = await Promise.all([
    readRetensiSettings(),
    readAcuanMap(todayString()),
    db
      .select({ peronId: peronHealth.peronId, status: peronHealth.status })
      .from(peronHealth)
      .where(and(eq(peronHealth.isArchived, false), inArray(peronHealth.status, ['perhatian', 'kritis']))),
    db
      .select()
      .from(peronAncaman)
      .orderBy(desc(peronAncaman.tanggal), desc(peronAncaman.createdAt)),
    db.query.peron.findMany({ columns: { id: true, nama: true, keuntunganPerKg: true } }),
  ])

  const peronById = new Map(peronAll.map((p) => [p.id, p]))
  const healthById = new Map(healthRows.map((h) => [h.peronId, h.status as 'perhatian' | 'kritis']))

  // Ancaman terbaru per peron + himpunan yang masih terbuka (tindakan='dipantau').
  const latestAncamanById = new Map<string, typeof ancamanRows[number]>()
  const openAncaman = new Set<string>()
  for (const a of ancamanRows) {
    if (!latestAncamanById.has(a.peronId)) latestAncamanById.set(a.peronId, a)
    if (a.tindakan === 'dipantau') openAncaman.add(a.peronId)
  }

  // Union kandidat: health perhatian/kritis ∪ ancaman terbuka.
  const candidateIds = new Set<string>([...healthById.keys(), ...openAncaman])
  const volumeMap = await readLatestVolume([...candidateIds])

  const rows: RetensiRow[] = []
  for (const id of candidateIds) {
    const p = peronById.get(id)
    if (!p) continue
    if (isPeronUmum(p.nama)) continue // catch-all, bukan hubungan tunggal → dikecualikan

    const volume = volumeMap[id] ?? null
    const latest = latestAncamanById.get(id) ?? null
    let latestAncaman: RetensiRow['latestAncaman'] = null
    if (latest) {
      const isTBS = isProdukTBSName(latest.produk)
      const r = hitungPertahanan({
        keuntunganPerKg: latest.keuntunganSebelum,
        isTBS,
        acuan: latest.hargaAcuanSaat,
        hargaKompetitor: latest.hargaKompetitor,
        ambang: settings.ambang,
        minMarginTbs: settings.minMarginTbs,
      })
      latestAncaman = {
        produk: latest.produk,
        hargaKompetitor: latest.hargaKompetitor,
        hargaAcuanSaat: latest.hargaAcuanSaat,
        gap: r.gap,
        tanggal: latest.tanggal,
      }
    }

    rows.push({
      peronId: id,
      nama: p.nama,
      keuntunganPerKg: p.keuntunganPerKg,
      healthStatus: healthById.get(id) ?? null,
      hasOpenAncaman: openAncaman.has(id),
      volume,
      // laba-berisiko utk ranking: volume × untung efektif (estimasi konservatif brondolan).
      labaRisiko: labaBerisiko(p.keuntunganPerKg, false, volume),
      latestAncaman,
    })
  }

  // Urut turun by laba-berisiko (null paling bawah) → perhatian pergi ke yg paling banyak dipertaruhkan.
  rows.sort((a, b) => {
    if (a.labaRisiko == null && b.labaRisiko == null) return a.nama.localeCompare(b.nama)
    if (a.labaRisiko == null) return 1
    if (b.labaRisiko == null) return -1
    return b.labaRisiko - a.labaRisiko
  })

  return { settings, acuanMap, volumeLabel: 'tonase minggu operasional terakhir', rows }
}

// ─── Konteks kalkulator utk 1 peron (prefill dari halaman detail) ────────────

export interface KalkulatorContext {
  peron: { id: string; nama: string; keuntunganPerKg: number }
  isUmum: boolean
  settings: RetensiSettings
  acuanMap: AcuanMap
  volume: number | null
}

export async function getKalkulatorContext(peronId: string): Promise<KalkulatorContext | null> {
  const session = await requireSession()
  requirePermission(session.user.role, 'canViewFinance')
  const p = await db.query.peron.findFirst({
    where: (t, { eq }) => eq(t.id, peronId),
    columns: { id: true, nama: true, keuntunganPerKg: true },
  })
  if (!p) return null
  const [settings, acuanMap, volumeMap] = await Promise.all([
    readRetensiSettings(),
    readAcuanMap(todayString()),
    readLatestVolume([peronId]),
  ])
  return { peron: p, isUmum: isPeronUmum(p.nama), settings, acuanMap, volume: volumeMap[peronId] ?? null }
}

// ─── Riwayat ancaman 1 peron ─────────────────────────────────────────────────

export async function getAncamanHistory(peronId: string) {
  const session = await requireSession()
  requirePermission(session.user.role, 'canViewFinance')
  return db
    .select({
      id: peronAncaman.id,
      tanggal: peronAncaman.tanggal,
      produk: peronAncaman.produk,
      hargaAcuanSaat: peronAncaman.hargaAcuanSaat,
      hargaKompetitor: peronAncaman.hargaKompetitor,
      keuntunganSebelum: peronAncaman.keuntunganSebelum,
      keuntunganSesudah: peronAncaman.keuntunganSesudah,
      volumeAcuan: peronAncaman.volumeAcuan,
      tindakan: peronAncaman.tindakan,
      catatan: peronAncaman.catatan,
      createdAt: peronAncaman.createdAt,
      oleh: user.name,
    })
    .from(peronAncaman)
    .leftJoin(user, eq(user.id, peronAncaman.createdBy))
    .where(eq(peronAncaman.peronId, peronId))
    .orderBy(desc(peronAncaman.tanggal), desc(peronAncaman.createdAt))
}

// ─── Terapkan margin (owner-only) ────────────────────────────────────────────

const applySchema = z.object({ peronId: z.string().min(1), keuntunganSesudah: z.coerce.number().int().min(0) })

export async function applyRetentionMargin(input: { peronId: string; keuntunganSesudah: number }) {
  const session = await requireOwner()
  const data = applySchema.parse(input)
  const existing = await db.query.peron.findFirst({ where: (t, { eq }) => eq(t.id, data.peronId) })
  if (!existing) throw new Error('Peron tidak ditemukan')

  await db.update(peron).set({ keuntunganPerKg: data.keuntunganSesudah }).where(eq(peron.id, data.peronId))

  await logActivity({
    userId: session.user.id,
    action: 'update',
    entityType: 'peron',
    entityId: data.peronId,
    description: `Retensi: untung CV ${existing.nama} ${existing.keuntunganPerKg} → ${data.keuntunganSesudah}/kg`,
    oldValues: { keuntunganPerKg: existing.keuntunganPerKg },
    newValues: { keuntunganPerKg: data.keuntunganSesudah },
  }).catch(() => {})

  revalidatePath('/peron')
  revalidatePath('/peron/kesehatan')
  revalidatePath(`/peron/kesehatan/${data.peronId}`)
  return { success: true }
}

// ─── Catat ancaman (canCreate) ───────────────────────────────────────────────

const ancamanSchema = z.object({
  peronId: z.string().min(1),
  produk: z.string().min(1),
  hargaAcuanSaat: z.coerce.number().int().min(0),
  hargaKompetitor: z.coerce.number().int().min(0),
  keuntunganSebelum: z.coerce.number().int().min(0),
  keuntunganSesudah: z.coerce.number().int().min(0).nullable().optional(),
  volumeAcuan: z.coerce.number().min(0).nullable().optional(),
  tindakan: z.enum(['dipantau', 'dipertahankan', 'dibiarkan']),
  catatan: z.string().max(500).nullable().optional(),
})

type AncamanInput = z.input<typeof ancamanSchema>

function ancamanValues(userId: string, data: z.output<typeof ancamanSchema>) {
  return {
    peronId: data.peronId,
    tanggal: todayString(),
    produk: data.produk,
    hargaAcuanSaat: data.hargaAcuanSaat,
    hargaKompetitor: data.hargaKompetitor,
    keuntunganSebelum: data.keuntunganSebelum,
    keuntunganSesudah: data.keuntunganSesudah ?? null,
    volumeAcuan: data.volumeAcuan ?? null,
    tindakan: data.tindakan,
    catatan: data.catatan?.trim() || null,
    createdBy: userId,
  }
}

export async function catatAncaman(input: AncamanInput) {
  const session = await requireSession()
  requirePermission(session.user.role, 'canCreate')
  const data = ancamanSchema.parse(input)
  await db.insert(peronAncaman).values(ancamanValues(session.user.id, data))
  await logActivity({
    userId: session.user.id,
    action: 'create',
    entityType: 'peron',
    entityId: data.peronId,
    description: `Catat ancaman peron (${data.tindakan}, kompetitor Rp${data.hargaKompetitor})`,
  }).catch(() => {})
  revalidatePath('/peron/kesehatan')
  revalidatePath(`/peron/kesehatan/${data.peronId}`)
  return { success: true }
}

/**
 * Terapkan margin + catat ancaman dalam satu submit. Owner-only (menulis margin).
 * tindakan dipaksa 'dipertahankan'; keuntunganSesudah wajib.
 */
export async function terapkanDanCatat(input: AncamanInput) {
  const session = await requireOwner()
  const data = ancamanSchema.parse({ ...input, tindakan: 'dipertahankan' })
  if (data.keuntunganSesudah == null) throw new Error('Untung CV baru wajib diisi untuk mempertahankan')

  const existing = await db.query.peron.findFirst({ where: (t, { eq }) => eq(t.id, data.peronId) })
  if (!existing) throw new Error('Peron tidak ditemukan')

  await db.transaction(async (tx) => {
    await tx.update(peron).set({ keuntunganPerKg: data.keuntunganSesudah! }).where(eq(peron.id, data.peronId))
    await tx.insert(peronAncaman).values(ancamanValues(session.user.id, data))
  })

  await logActivity({
    userId: session.user.id,
    action: 'update',
    entityType: 'peron',
    entityId: data.peronId,
    description: `Retensi: pertahankan ${existing.nama} — untung CV ${data.keuntunganSebelum} → ${data.keuntunganSesudah}/kg (kompetitor Rp${data.hargaKompetitor})`,
    oldValues: { keuntunganPerKg: existing.keuntunganPerKg },
    newValues: { keuntunganPerKg: data.keuntunganSesudah },
  }).catch(() => {})

  revalidatePath('/peron')
  revalidatePath('/peron/kesehatan')
  revalidatePath(`/peron/kesehatan/${data.peronId}`)
  return { success: true }
}
