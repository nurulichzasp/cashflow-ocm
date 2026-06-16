import type { ReactNode } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Pill status semantik — SATU kosakata di seluruh app (penjualan, pembelian,
 * laporan, buku kas). Warna fungsional & hemat (lihat token --ok/--warn/--crit
 * di globals.css):
 *   ok      = lunas / sudah / normal / arah masuk        (emerald-soft)
 *   warn    = belum / belum bayar / perhatian            (amber-soft)
 *   crit    = kritis / anomali                            (merah teredam)
 *   neutral = sisanya, termasuk arah keluar               (abu)
 * Tint lembut + teks gelap satu keluarga — bukan saturasi penuh.
 */
export type PillTone = 'ok' | 'warn' | 'crit' | 'neutral'

const TONE: Record<PillTone, string> = {
  ok: 'pill-ok',
  warn: 'pill-warn',
  crit: 'pill-crit',
  neutral: 'bg-muted text-muted-foreground',
}

export function StatusPill({
  tone,
  className,
  children,
}: {
  tone: PillTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const DOT_FG: Record<PillTone, string> = {
  ok: 'var(--ok-fg)',
  warn: 'var(--warn-fg)',
  crit: 'var(--crit-fg)',
  neutral: 'var(--muted-foreground)',
}

/**
 * Indikator status TENANG — dot kecil semantik + teks netral, TANPA background.
 * Bahasa visual yang sama dengan PaymentStatusDot, tapi label & tone bebas →
 * dipakai untuk status berulang non-pill (mis. setor PPN/PPh di laporan pajak).
 * Sebahasa dengan dot Lunas/Belum; bukan pill solid agar tak jadi "blok warna".
 */
export function StatusDotLabel({
  tone,
  label,
  loading,
  className,
}: {
  tone: PillTone
  label: string
  loading?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground whitespace-nowrap',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          loading && 'animate-spin border border-current border-t-transparent',
        )}
        style={loading ? undefined : { backgroundColor: DOT_FG[tone] }}
      />
      {label}
    </span>
  )
}

/**
 * Indikator ARAH kas (Masuk/Keluar) — glyph panah + label, TANPA background/border.
 * Sengaja minimalis (sebahasa dengan dot Lunas), bukan pill solid.
 *   Masuk → panah naik hijau (--masuk) · Keluar → panah turun merah (--keluar)
 * Glyph dekoratif (aria-hidden); label teks tetap untuk a11y.
 */
export function ArahIndicator({
  arah,
  className,
}: {
  arah: 'masuk' | 'keluar'
  className?: string
}) {
  const masuk = arah === 'masuk'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap',
        masuk ? 'text-masuk' : 'text-keluar',
        className,
      )}
    >
      {masuk
        ? <ArrowUp className="h-3 w-3 shrink-0" aria-hidden />
        : <ArrowDown className="h-3 w-3 shrink-0" aria-hidden />}
      {masuk ? 'Masuk' : 'Keluar'}
    </span>
  )
}

/**
 * Status PEMBAYARAN (Lunas/Belum) — dot kecil + teks netral, TANPA background/border.
 * Sengaja beda dari StatusPill: status bayar muncul berulang di list, jadi lebih
 * tenang sebagai dot. Dot dekoratif (aria-hidden); label teks tetap untuk a11y.
 *   Lunas → dot emerald (--ok-fg) · Belum → dot amber (--warn-fg)
 */
export function PaymentStatusDot({
  status,
  loading,
  className,
}: {
  status: 'lunas' | 'belum'
  loading?: boolean
  className?: string
}) {
  const isLunas = status === 'lunas'
  return (
    <StatusDotLabel
      tone={isLunas ? 'ok' : 'warn'}
      label={isLunas ? 'Lunas' : 'Belum'}
      loading={loading}
      className={className}
    />
  )
}
