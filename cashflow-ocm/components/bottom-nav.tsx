'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import {
  House,
  ShoppingCart,
  TrendingUp,
  Search,
  Menu,
  X,
} from 'lucide-react'
import { ShortcutGrid } from '@/components/shortcut-grid'
import { CommandPalette } from '@/components/command-palette'
import { parsePerms, isRouteActive } from '@/lib/nav-routes'
import { useNavCompact } from '@/lib/nav-visibility-store'

const primaryNav = [
  { href: '/dashboard', label: 'Beranda', icon: House, perm: undefined },
  { href: '/pembelian', label: 'Pembelian', icon: ShoppingCart, perm: 'pembelian' as const },
  { href: '/penjualan', label: 'Penjualan', icon: TrendingUp, perm: 'penjualan' as const },
]

function NavTab({
  active,
  label,
  icon: Icon,
  compact,
}: {
  active: boolean
  label: string
  icon: React.ElementType
  compact?: boolean
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.86 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      className="relative flex h-full w-full flex-col items-center justify-center gap-[3px]"
    >
      {/* Tanpa pill/kotak aktif — penanda cukup warna emerald pada ikon + label. */}
      <Icon
        className={cn(
          'relative z-10 transition-all duration-200 motion-reduce:transition-none',
          compact ? 'h-[19px] w-[19px]' : 'h-[21px] w-[21px]',
          active ? 'text-[var(--brand)]' : 'text-stone-400 dark:text-zinc-500',
        )}
        fill={active ? 'currentColor' : 'none'}
        strokeWidth={active ? 2.25 : 2}
      />
      {!compact && (
        <span
          className={cn(
            'relative z-10 text-[9px] leading-none tracking-tight transition-colors',
            active
              ? 'font-semibold text-[var(--brand)]'
              : 'font-medium text-stone-400 dark:text-zinc-500',
          )}
        >
          {label}
        </span>
      )}
    </motion.div>
  )
}

export function BottomNav({ isOwner, user }: { isOwner?: boolean; user?: any }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isActive = (href: string) => isRouteActive(pathname, href)

  const perms = parsePerms(user?.permissions)
  const compact = useNavCompact()

  // Search di TENGAH: 2 tab kiri (Dashboard, Pembelian) · Search · 1 tab kanan (Penjualan) · Profile
  const leftNav = primaryNav.filter((item) => {
    if (item.href === '/penjualan') return false
    if (isOwner) return true
    if (item.perm && perms[item.perm] === false) return false
    return true
  })
  const rightNav = primaryNav.filter((item) => {
    if (item.href !== '/penjualan') return false
    if (isOwner) return true
    if (item.perm && perms[item.perm] === false) return false
    return true
  })

  return (
    <>
      {/* Command palette (search) — dibuka via tombol Search di bawah / Cmd+K */}
      <CommandPalette showTrigger={false} isOwner={isOwner} perms={perms} />

      {/* Bottom bar — pill LIQUID GLASS senada FAB (bg-white/10 + blur + rim border).
          Scroll bawah → compact (label hilang, tab mengecil); scroll atas/puncak →
          penuh. Transisi halus, hormati prefers-reduced-motion. SELALU terlihat. */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-40 pointer-events-none"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      >
        <div className="flex justify-center px-5">
          <nav className={cn(
            'pointer-events-auto relative flex w-fit items-center gap-0.5 rounded-full backdrop-blur-xl backdrop-saturate-150 bg-white/[0.10] border border-white/[0.15] shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-200 motion-reduce:transition-none',
            compact ? 'p-0.5' : 'p-1',
          )}>
            <div className="flex items-center gap-0.5">
              {leftNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className={cn(
                    'flex items-center justify-center transition-all duration-200 motion-reduce:transition-none',
                    compact ? 'h-11 w-12' : 'h-[52px] w-[60px]',
                  )}
                >
                  <NavTab active={isActive(item.href)} label={item.label} icon={item.icon} compact={compact} />
                </Link>
              ))}

              {/* Search — TENGAH (titik fokus bottom nav), buka command palette */}
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('ocm-open-search'))}
                aria-label="Cari"
                className={cn(
                  'flex items-center justify-center transition-all duration-200 motion-reduce:transition-none',
                  compact ? 'h-11 w-12' : 'h-[52px] w-[60px]',
                )}
              >
                <NavTab active={false} label="Cari" icon={Search} compact={compact} />
              </button>

              {rightNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className={cn(
                    'flex items-center justify-center transition-all duration-200 motion-reduce:transition-none',
                    compact ? 'h-11 w-12' : 'h-[52px] w-[60px]',
                  )}
                >
                  <NavTab active={isActive(item.href)} label={item.label} icon={item.icon} compact={compact} />
                </Link>
              ))}

              {/* Lainnya — gerbang ke semua halaman sekunder (drawer) */}
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Lainnya"
                className={cn(
                  'flex items-center justify-center transition-all duration-200 motion-reduce:transition-none',
                  compact ? 'h-11 w-12' : 'h-[52px] w-[60px]',
                )}
              >
                <NavTab active={drawerOpen} label="Lainnya" icon={Menu} compact={compact} />
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Drawer pintasan */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="glass-panel absolute inset-x-0 bottom-0 rounded-t-3xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-stone-300 dark:bg-zinc-700" />
              </div>

              {/* Header drawer — hanya pintasan halaman kerja (profil/akun/pengaturan
                  kini lewat avatar header → /profil). */}
              <div className="flex items-center justify-between px-5 pt-2 pb-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
                  Pintasan
                </p>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Tutup"
                  className="-mr-2 p-2 rounded-lg text-stone-400 dark:text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Shortcut grid — halaman kerja sekunder (tanpa Pengaturan) */}
              <div className="px-4 pb-5 pt-1">
                <ShortcutGrid
                  isOwner={isOwner}
                  perms={perms}
                  onNavigate={() => setDrawerOpen(false)}
                  excludePrimary
                  excludePaths={['/pengaturan']}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
