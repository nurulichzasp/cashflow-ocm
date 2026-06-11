export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount)
}

/**
 * Ringkas & elegan untuk angka GLANCE (kartu ringkasan, hero, KPI):
 *   1.234.567.890 → "Rp 1,23 M" · 296.801.560 → "Rp 296,8 jt" · 45.000 → "Rp 45 rb"
 * Tujuan: terbaca dalam 3 detik, sedikit digit. Tabel/detail/form TETAP pakai
 * formatRupiah() (presisi penuh ke rupiah).
 */
export function formatCompact(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const a = Math.abs(amount)
  const f = (v: number, dec: number) =>
    v.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: dec })
  if (a >= 1_000_000_000) return `${sign}Rp ${f(a / 1_000_000_000, 2)} M`
  if (a >= 1_000_000) return `${sign}Rp ${f(a / 1_000_000, 1)} jt`
  if (a >= 1_000) return `${sign}Rp ${f(a / 1_000, 0)} rb`
  return `${sign}Rp ${f(a, 0)}`
}

/** Sama seperti formatCompact tapi tanpa prefix "Rp" (untuk render hierarki tipografi). */
export function formatCompactValue(amount: number): string {
  return formatCompact(amount).replace(/^(-?)Rp\s/, '$1')
}

export function formatTanggal(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

/**
 * Tanggal lengkap dengan nama hari: "Rabu, 10 Juni 2026".
 * Untuk konteks tunggal (header detail, sapaan dashboard) — BUKAN tabel padat
 * (terlalu lebar). Tabel tetap pakai formatTanggal().
 */
export function formatTanggalLengkap(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}
