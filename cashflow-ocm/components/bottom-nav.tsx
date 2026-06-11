'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import {
  House,
  ShoppingCart,
  Banknote,
  Search,
  Menu,
  X,
} from 'lucide-react'
import { ShortcutGrid } from '@/components/shortcut-grid'
import { CommandPalette } from '@/components/command-palette'
import { isFullscreenRoute } from '@/components/mobile-header'
import { parsePerms, isRouteActive } from '@/lib/nav-routes'
import { useNavCompact } from '@/lib/nav-visibility-store'

const primaryNav = [
  { href: '/dashboard', label: 'Beranda', icon: House, perm: undefined },
  { href: '/pembelian', label: 'Pembelian', icon: ShoppingCart, perm: 'pembelian' as const },
  // Penjualan = uang masuk → ikon Banknote (uang kertas). Bukan $ (kita Rupiah),
  // jelas terbaca kecil, dan tak mirip cart/search/home/menu.
  { href: '/penjualan', label: 'Penjualan', icon: Banknote, perm: 'penjualan' as const },
]

function NavTab({
  active,
  icon: Icon,
  dot,
}: {
  active: boolean
  icon: React.ElementType
  /** Slot badge notifikasi (titik merah ala IG). Belum diwire — siap pakai. */
  dot?: boolean
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      className="relative flex h-full w-full items-center justify-center"
    >
      {/* Pill aktif gaya IG — oval putih translucent yang MELUNCUR antar tab (layoutId),
          tanpa border tegas. */}
      {active && (
        <motion.span
          layoutId="nav-active-pill"
          transition={{ type: 'spring', stiffness: 460, damping: 36 }}
          className="absolute inset-x-1 inset-y-[7px] rounded-full bg-white/[0.12] dark:bg-white/[0.14]"
        />
      )}
      <Icon
        className={cn(
          'relative z-10 transition-colors',
          active ? 'text-[var(--brand)]' : 'text-stone-400 dark:text-zinc-400',
        )}
        style={{ width: 25, height: 25 }}
        fill={active ? 'currentColor' : 'none'}
        strokeWidth={active ? 1.9 : 1.6}
      />
      {dot && (
        <span className="absolute right-[9px] top-[9px] z-10 h-2 w-2 rounded-full bg-red-500 ring-2 ring-black/40" />
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
  const prefersReduced = useReducedMotion()
  // Profil & Pengaturan = full-screen → bar disembunyikan (CommandPalette tetap mount).
  const hideBar = isFullscreenRoute(pathname)

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

      {!hideBar && (
      <>
      {/* Bottom bar — LIQUID GLASS ala Instagram: SANGAT transparan (bg putih ~7%)
          + blur kuat + highlight tepi atas (inset) → kesan kaca cembung; konten
          samar tembus. Ikon-only + pill aktif geser. Scroll bawah → menyusut halus
          (spring scale), scroll atas/puncak → penuh. SELALU terlihat. */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-40 pointer-events-none"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      >
        <div className="flex justify-center px-5">
          <motion.nav
            animate={{ scale: compact ? 0.9 : 1 }}
            transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
            style={{ transformOrigin: 'bottom center' }}
            className="pointer-events-auto relative flex w-fit items-center gap-0.5 rounded-full p-1 backdrop-blur-2xl backdrop-saturate-150 bg-white/[0.07] border border-white/[0.12] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.20),0_10px_30px_-6px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center gap-0.5">
              {leftNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className="flex h-12 w-14 items-center justify-center"
                >
                  <NavTab active={isActive(item.href)} icon={item.icon} />
                </Link>
              ))}

              {/* Search — TENGAH (titik fokus bottom nav), buka command palette */}
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('ocm-open-search'))}
                aria-label="Cari"
                className="flex h-12 w-14 items-center justify-center"
              >
                <NavTab active={false} icon={Search} />
              </button>

              {rightNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className="flex h-12 w-14 items-center justify-center"
                >
                  <NavTab active={isActive(item.href)} icon={item.icon} />
                </Link>
              ))}

              {/* Lainnya — gerbang ke semua halaman sekunder (drawer) */}
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Lainnya"
                className="flex h-12 w-14 items-center justify-center"
              >
                <NavTab active={drawerOpen} icon={Menu} />
              </button>
            </div>
          </motion.nav>
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
      )}
    </>
  )
}
