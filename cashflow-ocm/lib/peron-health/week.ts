import { HEALTH_CONFIG } from './config'

/**
 * Helper tanggal/minggu — semua dalam WIB (UTC+7, tetap tanpa DST).
 * Tanggal di DB disimpan "YYYY-MM-DD" (sudah WIB saat input). Bucketing minggu
 * memakai minggu ISO (mulai Senin).
 */

const MS_DAY = 24 * 60 * 60 * 1000
const WIB_MS = HEALTH_CONFIG.TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000

/** Tanggal hari ini di WIB sebagai "YYYY-MM-DD". */
export function todayWIB(now: Date = new Date()): string {
  return new Date(now.getTime() + WIB_MS).toISOString().slice(0, 10)
}

/** Parse "YYYY-MM-DD" → Date UTC tengah hari (hindari geser hari karena offset). */
function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

/** Senin (ISO) dari minggu yang memuat tanggal `ymd`, sebagai "YYYY-MM-DD". */
export function weekStart(ymd: string): string {
  const dt = parseYmd(ymd)
  const dow = dt.getUTCDay() // 0=Min..6=Sab
  const isoOffset = dow === 0 ? 6 : dow - 1 // hari sejak Senin
  const monday = new Date(dt.getTime() - isoOffset * MS_DAY)
  return monday.toISOString().slice(0, 10)
}

/** Selisih hari (bulat) antara dua "YYYY-MM-DD" (a - b). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseYmd(a).getTime() - parseYmd(b).getTime()) / MS_DAY)
}

/** Urutan minggu operasional terakhir → daftar weekStart, terbaru dulu sudah disediakan caller. */
export function median(values: number[]): number {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
