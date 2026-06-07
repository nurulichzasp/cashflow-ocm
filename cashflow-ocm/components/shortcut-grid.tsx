'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { usePathname } from 'next/navigation'
import { visibleRoutes } from '@/lib/nav-routes'
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
}: {
  isOwner?: boolean
  perms?: { pembelian?: boolean; penjualan?: boolean; kas?: boolean; biaya?: boolean }
  onNavigate?: () => void
  excludePrimary?: boolean
}) {
  const all = visibleRoutes(isOwner, perms)
  const routes = excludePrimary ? all.filter((r) => !PRIMARY_PATHS.includes(r.path)) : all
  const pathname = usePathname()

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
      {routes.map((r) => {
        const Icon = r.icon
        const isActive = pathname === r.path || (r.path !== '/dashboard' && pathname.startsWith(r.path))
        return (
          <motion.div key={r.path} whileTap={{ scale: 0.95 }}>
            <Link
              href={r.path}
              onClick={onNavigate}
              className={cn(
                'flex h-full flex-col items-center justify-center gap-2.5 rounded-xl border px-2 py-4 text-center transition-colors',
                isActive
                  ? 'border-orange-200/80 bg-orange-50/80 dark:border-orange-500/20 dark:bg-orange-500/10'
                  : 'border-black/10 bg-black/[0.02] hover:bg-black/[0.04] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]'
              )}
            >
              <Icon
                className={cn('h-6 w-6', isActive ? 'text-orange-600 dark:text-orange-400' : 'text-stone-600 dark:text-zinc-300')}
                strokeWidth={isActive ? 2.25 : 1.75}
              />
              <span className={cn('text-[10px] font-medium uppercase tracking-wide', isActive ? 'text-orange-600 dark:text-orange-400' : 'text-stone-500 dark:text-zinc-400')}>
                {r.label}
              </span>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
