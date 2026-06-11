import { getDb } from '@/lib/db'
import { pembelian, peron, peronSnapshot, peronHealth } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'
import { HEALTH_CONFIG, type PeronStatus, type SeasonVerdict } from './config'
import { weekStart, diffDays, median, todayWIB } from './week'

const C = HEALTH_CONFIG

type Row = { peronId: string; tanggal: string; tonase: number }

/**
 * Hitung ulang kesehatan SEMUA peron dari tabel pembelian (SOURCE TABLE tonase).
 * Semua alarm berbasis SHARE (kontribusi relatif), bukan kg mentah. Idempoten:
 * upsert snapshot per (peron, minggu) + health per peron. Aman dipanggil berulang.
 */
export async function rebuildPeronHealth(): Promise<{ peronCount: number; weekCount: number }> {
  const db = getDb()

  const [rows, peronList, healthRows] = await Promise.all([
    db.select({ peronId: pembelian.peronId, tanggal: pembelian.tanggal, tonase: pembelian.tonase }).from(pembelian),
    db.select({ id: peron.id }).from(peron),
    db.select({ peronId: peronHealth.peronId, isArchived: peronHealth.isArchived }).from(peronHealth),
  ])

  const archived = new Set(healthRows.filter((h) => h.isArchived).map((h) => h.peronId))

  // ── Bucket kg per (peron, minggu) & per minggu ──────────────────────────────
  const kgPW = new Map<string, Map<string, number>>() // peronId → (weekStart → kg)
  const cntPW = new Map<string, Map<string, number>>() // peronId → (weekStart → setor_count)
  const datesPW = new Map<string, string[]>() // peronId → daftar tanggal setor (untuk gap & last)
  const totalKgW = new Map<string, number>() // weekStart → total kg semua peron
  const allWeeks = new Set<string>()

  for (const r of rows as Row[]) {
    if (!r.peronId || !r.tanggal) continue
    const w = weekStart(r.tanggal)
    allWeeks.add(w)
    if (!kgPW.has(r.peronId)) { kgPW.set(r.peronId, new Map()); cntPW.set(r.peronId, new Map()); datesPW.set(r.peronId, []) }
    const km = kgPW.get(r.peronId)!
    const cm = cntPW.get(r.peronId)!
    km.set(w, (km.get(w) ?? 0) + (r.tonase ?? 0))
    cm.set(w, (cm.get(w) ?? 0) + 1)
    datesPW.get(r.peronId)!.push(r.tanggal)
    totalKgW.set(w, (totalKgW.get(w) ?? 0) + (r.tonase ?? 0))
  }

  // Minggu terurut (asc) + tandai operasional (total ≥ ratio × median total)
  const weeksAsc = [...allWeeks].sort()
  const medianTotal = median([...totalKgW.values()])
  const opThreshold = medianTotal * C.NONOPERATIONAL_TOTAL_RATIO
  const isOpWeek = new Map<string, boolean>()
  for (const w of weeksAsc) isOpWeek.set(w, (totalKgW.get(w) ?? 0) >= opThreshold)
  const opWeeksAsc = weeksAsc.filter((w) => isOpWeek.get(w))

  const today = todayWIB()
  const now = new Date()

  // ── Upsert snapshot per (peron, minggu yang ada datanya) ────────────────────
  const snapshotRows: (typeof peronSnapshot.$inferInsert)[] = []
  for (const [peronId, km] of kgPW) {
    const cm = cntPW.get(peronId)!
    for (const [w, kg] of km) {
      const total = totalKgW.get(w) ?? 0
      snapshotRows.push({
        peronId,
        weekStart: w,
        totalKg: kg,
        setorCount: cm.get(w) ?? 0,
        share: total > 0 ? kg / total : 0,
        isOperationalWeek: isOpWeek.get(w) ?? true,
        computedAt: now,
      })
    }
  }

  // ── Hitung status per peron ─────────────────────────────────────────────────
  const healthUpserts: (typeof peronHealth.$inferInsert)[] = []
  const latestOpWeek = opWeeksAsc[opWeeksAsc.length - 1] ?? null

  for (const p of peronList) {
    if (archived.has(p.id)) continue
    const km = kgPW.get(p.id) ?? new Map<string, number>()

    // share(p,w) untuk tiap minggu operasional (0 bila tak setor)
    const shareAt = (w: string) => {
      const total = totalKgW.get(w) ?? 0
      return total > 0 ? (km.get(w) ?? 0) / total : 0
    }

    const opWeeksWithData = opWeeksAsc.filter((w) => (km.get(w) ?? 0) > 0)
    const baselineWeeks = latestOpWeek
      ? opWeeksAsc.filter((w) => w !== latestOpWeek).slice(-C.BASELINE_WEEKS)
      : []
    const shareBase = baselineWeeks.length
      ? baselineWeeks.reduce((s, w) => s + shareAt(w), 0) / baselineWeeks.length
      : 0
    const shareCurrent = latestOpWeek ? shareAt(latestOpWeek) : 0
    const shareDelta = shareBase > 0 ? (shareCurrent - shareBase) / shareBase : 0

    // Recency: typical gap & days since last
    const dates = [...(datesPW.get(p.id) ?? [])].sort()
    const lastSetor = dates[dates.length - 1] ?? null
    const gaps: number[] = []
    for (let i = 1; i < dates.length; i++) gaps.push(diffDays(dates[i], dates[i - 1]))
    const typicalGap = median(gaps)
    const daysSinceLast = lastSetor ? diffDays(today, lastSetor) : 9999

    // Decline beruntun (dari minggu op terbaru ke belakang)
    let declineWeeks = 0
    let kritisConsecutive = 0
    for (let i = opWeeksAsc.length - 1; i >= 0; i--) {
      const wDelta = shareBase > 0 ? (shareAt(opWeeksAsc[i]) - shareBase) / shareBase : 0
      if (wDelta < C.PERHATIAN_DELTA) declineWeeks++
      else break
    }
    for (let i = opWeeksAsc.length - 1; i >= 0; i--) {
      const wDelta = shareBase > 0 ? (shareAt(opWeeksAsc[i]) - shareBase) / shareBase : 0
      if (wDelta < C.KRITIS_DELTA) kritisConsecutive++
      else break
    }

    // Season verdict (hanya saat peron memang turun)
    let seasonVerdict: SeasonVerdict = null
    if (latestOpWeek && shareDelta < C.PERHATIAN_DELTA) {
      const curTotal = totalKgW.get(latestOpWeek) ?? 0
      seasonVerdict = medianTotal > 0 && curTotal < medianTotal * 0.7 ? 'musim' : 'lari'
    }

    // Status (urutan: data_kurang → kritis → perhatian → normal)
    let status: PeronStatus
    const currentWeekOperational = latestOpWeek != null
    if (opWeeksWithData.length < C.MIN_HISTORY_WEEKS || shareBase <= 0) {
      status = 'data_kurang'
    } else if (
      kritisConsecutive >= C.KRITIS_CONSECUTIVE_WEEKS ||
      (currentWeekOperational && typicalGap > 0 && daysSinceLast > typicalGap * C.RECENCY_KRITIS_MULT)
    ) {
      status = 'kritis'
    } else if (
      shareDelta < C.PERHATIAN_DELTA ||
      (typicalGap > 0 && daysSinceLast > typicalGap * C.RECENCY_PERHATIAN_MULT)
    ) {
      status = 'perhatian'
    } else {
      status = 'normal'
    }

    healthUpserts.push({
      peronId: p.id,
      status,
      shareCurrent,
      shareBase,
      shareDelta,
      declineWeeks,
      typicalGap,
      daysSinceLast: Math.min(daysSinceLast, 9999),
      lastSetorDate: lastSetor,
      seasonVerdict: status === 'data_kurang' ? null : seasonVerdict,
      isArchived: false,
      updatedAt: now,
    })
  }

  // ── Tulis ke DB (upsert) ────────────────────────────────────────────────────
  if (snapshotRows.length) {
    await db.insert(peronSnapshot).values(snapshotRows).onConflictDoUpdate({
      target: [peronSnapshot.peronId, peronSnapshot.weekStart],
      set: {
        totalKg: sqlExcluded('total_kg'),
        setorCount: sqlExcluded('setor_count'),
        share: sqlExcluded('share'),
        isOperationalWeek: sqlExcluded('is_operational_week'),
        computedAt: now,
      },
    })
  }
  for (const h of healthUpserts) {
    // Jangan timpa peronId (target) maupun isArchived (dikelola archivePeron).
    const { peronId: _p, isArchived: _a, ...updatable } = h
    await db.insert(peronHealth).values(h).onConflictDoUpdate({
      target: peronHealth.peronId,
      set: updatable,
    })
  }

  return { peronCount: healthUpserts.length, weekCount: opWeeksAsc.length }
}

// Helper: referensi nilai "excluded" (baris konflik) pada upsert SQLite batch.
function sqlExcluded(col: string) {
  return sql.raw(`excluded.${col}`)
}
