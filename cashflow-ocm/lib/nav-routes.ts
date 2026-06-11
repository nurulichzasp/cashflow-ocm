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

/** Semua path rute yang diketahui — kandidat default untuk longest-match. */
const ALL_ROUTE_PATHS = APP_ROUTES.map((r) => r.path)

/**
 * Longest-match: dari daftar path kandidat, kembalikan path terpanjang yang
 * cocok sebagai segmen-prefix dari `pathname`. Entri yang lebih spesifik
 * menang, sehingga `/peron` TIDAK ikut menang untuk `/peron/kesehatan`
 * (gotcha yang sama dengan publicPaths `startsWith` di proxy.ts).
 */
export function matchRoutePath(pathname: string, candidatePaths: string[] = ALL_ROUTE_PATHS): string | null {
  let best: string | null = null
  for (const path of candidatePaths) {
    const isMatch = pathname === path || pathname.startsWith(path + '/')
    if (!isMatch) continue
    if (best === null || path.length > best.length) best = path
  }
  return best
}

/**
 * Apakah `href` adalah entri aktif untuk `pathname` (longest-match menang).
 * Dashboard hanya aktif saat path persis `/dashboard` (bukan sebagai prefix).
 */
export function isRouteActive(
  pathname: string,
  href: string,
  candidatePaths: string[] = ALL_ROUTE_PATHS,
): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return matchRoutePath(pathname, candidatePaths) === href
}

/**
 * Judul halaman dari entri rute hasil longest-match. Mengembalikan `null` bila
 * tak ada yang cocok agar pemanggil bisa menerapkan fallback-nya sendiri.
 */
export function resolvePageTitle(pathname: string): string | null {
  const best = matchRoutePath(pathname)
  if (!best) return null
  return APP_ROUTES.find((r) => r.path === best)?.label ?? null
}

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
