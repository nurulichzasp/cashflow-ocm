import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Receipt,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  HeartPulse,
  type LucideIcon,
} from 'lucide-react'

export type AppRoute = {
  label: string
  path: string
  group: string
  icon: LucideIcon
  /** key permission di user.permissions; undefined = selalu boleh (selain ownerOnly) */
  perm?: 'pembelian' | 'penjualan' | 'kas' | 'biaya'
  ownerOnly?: boolean
}

/**
 * SUMBER KEBENARAN navigasi non-tab — dipakai oleh Shortcut Grid & Command
 * Palette. Diverifikasi langsung dari folder app/(dashboard)/*: hanya route
 * yang BENAR-BENAR ada yang dicantumkan (mis. tidak ada /bank, /modal, /bast,
 * /invoice, /rekap di codebase ini).
 */
export const APP_ROUTES: AppRoute[] = [
  // — Operasional —
  { label: 'Dashboard', path: '/dashboard', group: 'Operasional', icon: LayoutDashboard },
  { label: 'Pembelian', path: '/pembelian', group: 'Operasional', icon: ShoppingCart, perm: 'pembelian' },
  { label: 'Penjualan', path: '/penjualan', group: 'Operasional', icon: TrendingUp, perm: 'penjualan' },

  // — Keuangan —
  { label: 'Buku Kas', path: '/kas', group: 'Keuangan', icon: Wallet, perm: 'kas' },
  { label: 'Biaya', path: '/biaya', group: 'Keuangan', icon: Receipt, perm: 'biaya' },
  { label: 'Laporan', path: '/laporan', group: 'Keuangan', icon: BarChart3 },

  // — Master Data —
  { label: 'Peron', path: '/peron', group: 'Master Data', icon: Users },
  { label: 'Kesehatan Peron', path: '/peron/kesehatan', group: 'Master Data', icon: HeartPulse },
  { label: 'Harga Acuan', path: '/harga', group: 'Master Data', icon: DollarSign },

  // — Lainnya —
  { label: 'Pengaturan', path: '/pengaturan', group: 'Lainnya', icon: Settings, ownerOnly: true },
]

type Perms = { pembelian?: boolean; penjualan?: boolean; kas?: boolean; biaya?: boolean }

/** Filter route sesuai role & permission user (sejalan dgn sidebar/bottom-nav). */
export function visibleRoutes(isOwner?: boolean, perms?: Perms): AppRoute[] {
  return APP_ROUTES.filter((r) => {
    if (isOwner) return true
    if (r.ownerOnly) return false
    if (r.perm && perms?.[r.perm] === false) return false
    return true
  })
}

export function parsePerms(permissions?: string | null): Perms {
  const fallback: Perms = { pembelian: true, penjualan: true, kas: true, biaya: true }
  if (!permissions) return fallback
  try {
    return { ...fallback, ...JSON.parse(permissions) }
  } catch {
    return fallback
  }
}
