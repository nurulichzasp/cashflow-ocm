import type { ReactNode } from 'react'

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
        style={loading ? undefined : { backgroundColor: isLunas ? 'var(--ok-fg)' : 'var(--warn-fg)' }}
      />
      {isLunas ? 'Lunas' : 'Belum'}
    </span>
  )
}
