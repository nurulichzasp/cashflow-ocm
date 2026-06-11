'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { usePathname } from 'next/navigation'
import { visibleRoutes, isRouteActive } from '@/lib/nav-routes'
import { cn } from '@/lib/utils'

/**
 * ShortcutGrid — app-launcher minimalist premium (monokrom, tanpa glow/oranye).
 * Solusi "sekali tap" supaya halaman penting tidak menumpuk di Menu.
 */
const PRIMARY_PATHS = ['/dashboard', '/pembelian', '/penjualan']

export function ShortcutGrid({
  isOwner,
  perms,
  onNavigate,
  excludePrimary,
  excludePaths,
}: {
  isOwner?: boolean
  perms?: { pembelian?: boolean; penjualan?: boolean; kas?: boolean; biaya?: boolean }
  onNavigate?: () => void
  excludePrimary?: boolean
  /** Path tambahan yang disembunyikan (mis. ['/pengaturan'] — kini diakses via Profil). */
  excludePaths?: string[]
}) {
  const all = visibleRoutes(isOwner, perms)
  const routes = all.filter((r) => {
    if (excludePrimary && PRIMARY_PATHS.includes(r.path)) return false
    if (excludePaths && excludePaths.includes(r.path)) return false
    return true
  })
  const pathname = usePathname()

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
      {routes.map((r) => {
        const Icon = r.icon
        const isActive = isRouteActive(pathname, r.path)
        return (
          <motion.div key={r.path} whileTap={{ scale: 0.95 }}>
            <Link
              href={r.path}
              onClick={onNavigate}
              className={cn(
                'flex h-full flex-col items-center justify-center gap-2.5 rounded-xl border px-2 py-4 text-center transition-colors',
                isActive
                  ? 'border-white/[0.12] bg-white/[0.07] dark:border-white/[0.12] dark:bg-white/[0.07]'
                  : 'border-black/[0.06] bg-black/[0.02] hover:bg-black/[0.04] dark:border-white/[0.06] dark:bg-white/[0.025] dark:hover:bg-white/[0.05]'
              )}
            >
              <Icon
                className={cn('h-6 w-6', isActive ? 'text-stone-900 dark:text-white' : 'text-stone-600 dark:text-zinc-400')}
                strokeWidth={isActive ? 2.25 : 1.75}
              />
              <span className={cn('text-[10px] font-medium uppercase tracking-wide', isActive ? 'text-stone-900 dark:text-white' : 'text-stone-500 dark:text-zinc-500')}>
                {r.label}
              </span>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
