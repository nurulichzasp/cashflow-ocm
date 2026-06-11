/**
 * Konstanta tuning Kesehatan Peron. Semua alarm berbasis SHARE (kontribusi
 * relatif peron ke total volume OCM), BUKAN kg mentah — supaya musim trek
 * (semua peron drop bareng) tidak memicu alarm palsu.
 */
export const HEALTH_CONFIG = {
  BASELINE_WEEKS: 8, // minggu operasional untuk baseline share
  MIN_HISTORY_WEEKS: 4, // di bawah ini → data_kurang (peron baru)
  PERHATIAN_DELTA: -0.15, // share turun >15% dari kebiasaan
  KRITIS_DELTA: -0.25, // share turun >25%
  KRITIS_CONSECUTIVE_WEEKS: 2,
  RECENCY_PERHATIAN_MULT: 2.0, // days_since_last > typical_gap × ini → perhatian
  RECENCY_KRITIS_MULT: 3.0,
  NONOPERATIONAL_TOTAL_RATIO: 0.2, // minggu < 20% median total → libur, dikecualikan
  TIMEZONE_OFFSET_HOURS: 7, // WIB = UTC+7 (tetap, tanpa DST)
} as const

export type PeronStatus = 'normal' | 'perhatian' | 'kritis' | 'data_kurang'
export type SeasonVerdict = 'musim' | 'lari' | null
