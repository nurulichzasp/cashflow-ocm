'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { visibleRoutes } from '@/lib/nav-routes'

/**
 * ShortcutGrid — app-launcher minimalist premium (monokrom, tanpa glow/oranye).
 * Solusi "sekali tap" supaya halaman penting tidak menumpuk di Menu.
 */
export function ShortcutGrid({
  isOwner,
  perms,
  onNavigate,
}: {
  isOwner?: boolean
  perms?: { pembelian?: boolean; penjualan?: boolean; kas?: boolean; biaya?: boolean }
  onNavigate?: () => void
}) {
  const routes = visibleRoutes(isOwner, perms)

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
      {routes.map((r) => {
        const Icon = r.icon
        return (
          <motion.div key={r.path} whileTap={{ scale: 0.95 }}>
            <Link
              href={r.path}
              onClick={onNavigate}
              className="flex h-full flex-col items-center justify-center gap-2.5 rounded-xl border border-black/10 bg-black/[0.02] px-2 py-4 text-center transition-colors hover:bg-black/[0.04] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
            >
              <Icon className="h-6 w-6 text-stone-600 dark:text-zinc-300" strokeWidth={1.75} />
              <span className="text-[10px] font-medium uppercase tracking-wide text-stone-500 dark:text-zinc-400">
                {r.label}
              </span>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
