import type { PeronStatus } from './config'

/**
 * Presentasi status (label, warna dot, teks). Warna status TERPISAH dari accent
 * emerald (yang khusus CTA/aktif). Pakai hex eksplisit agar tak ternetralkan
 * catch-all globals (merah/amber → abu).
 */
export const STATUS_META: Record<PeronStatus, { label: string; dot: string; text: string; rank: number }> = {
  kritis: { label: 'Kritis', dot: '#EF4444', text: 'text-[#DC2626] dark:text-[#F87171]', rank: 0 },
  perhatian: { label: 'Perhatian', dot: '#D97706', text: 'text-[#B45309] dark:text-[#FBBF24]', rank: 1 },
  normal: { label: 'Sehat', dot: '#10B981', text: 'text-stone-500 dark:text-zinc-400', rank: 2 },
  data_kurang: { label: 'Data Kurang', dot: '#A8A29E', text: 'text-stone-400 dark:text-zinc-500', rank: 3 },
}

/** Persen ringkas dari fraksi 0..1. */
export function pct(frac: number): string {
  return `${(frac * 100).toFixed(frac < 0.1 ? 1 : 0)}%`
}

/** Delta share sebagai "−56%" / "+12%". */
export function deltaPct(delta: number): string {
  const sign = delta > 0 ? '+' : '−'
  return `${sign}${Math.abs(delta * 100).toFixed(0)}%`
}
