import { describe, it, expect } from 'vitest'
import { median, weekStart, diffDays, todayWIB } from '../peron-health/week'

describe('median', () => {
  it('kosong → 0', () => {
    expect(median([])).toBe(0)
  })
  it('ganjil → tengah; genap → rata-rata dua tengah', () => {
    expect(median([1, 2, 3])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })
  it('tidak terpengaruh urutan input', () => {
    expect(median([3, 1, 2])).toBe(2)
  })
})

describe('weekStart (Senin ISO)', () => {
  it('Senin → dirinya sendiri (1 Jan 2024 = Senin)', () => {
    expect(weekStart('2024-01-01')).toBe('2024-01-01')
  })
  it('Minggu di minggu yang sama → Senin sebelumnya', () => {
    expect(weekStart('2024-01-07')).toBe('2024-01-01')
  })
  it('Senin berikutnya → minggu baru', () => {
    expect(weekStart('2024-01-08')).toBe('2024-01-08')
  })
  it('invariant: hasilnya selalu Senin & idempotent', () => {
    for (const d of ['2026-06-15', '2026-02-28', '2025-12-31', '2024-02-29']) {
      const ws = weekStart(d)
      expect(weekStart(ws)).toBe(ws) // idempotent
      expect(diffDays(d, ws)).toBeGreaterThanOrEqual(0)
      expect(diffDays(d, ws)).toBeLessThanOrEqual(6)
    }
  })
})

describe('diffDays', () => {
  it('selisih hari bertanda (a - b)', () => {
    expect(diffDays('2026-06-15', '2026-06-10')).toBe(5)
    expect(diffDays('2026-06-10', '2026-06-15')).toBe(-5)
  })
  it('melintasi batas bulan', () => {
    expect(diffDays('2026-01-01', '2025-12-31')).toBe(1)
  })
})

describe('todayWIB', () => {
  it('menggeser +7 jam lalu ambil tanggalnya', () => {
    // 14 Jun 20:00 UTC + 7 = 15 Jun 03:00 WIB
    expect(todayWIB(new Date('2026-06-14T20:00:00Z'))).toBe('2026-06-15')
    // 14 Jun 16:00 UTC + 7 = 14 Jun 23:00 WIB
    expect(todayWIB(new Date('2026-06-14T16:00:00Z'))).toBe('2026-06-14')
  })
})
