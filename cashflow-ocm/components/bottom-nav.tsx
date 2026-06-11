'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth-client'
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Search,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { ProfileDialog } from '@/components/profile-dialog'
import { ShortcutGrid } from '@/components/shortcut-grid'
import { CommandPalette } from '@/components/command-palette'
import { fotoUrl } from '@/lib/foto-url'
import { parsePerms, isRouteActive } from '@/lib/nav-routes'
import { formatTanggalLengkap } from '@/lib/format'

const primaryNav = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard, perm: undefined },
  { href: '/pembelian', label: 'Pembelian', icon: ShoppingCart, perm: 'pembelian' as const },
  { href: '/penjualan', label: 'Penjualan', icon: TrendingUp, perm: 'penjualan' as const },
]

function getInitials(name?: string) {
  if (!name) return 'U'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

/** Greeting berdasarkan jam lokal — touchpoint personal singkat. */
function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 4 && h < 11) return 'Selamat pagi'
  if (h >= 11 && h < 15) return 'Selamat siang'
  if (h >= 15 && h < 18) return 'Selamat sore'
  return 'Selamat malam'
}

function NavTab({
  active,
  label,
  icon: Icon,
}: {
  active: boolean
  label: string
  icon: React.ElementType
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.86 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      className="relative flex h-full w-full flex-col items-center justify-center gap-[3px]"
    >
      {/* Oval aktif yang MELUNCUR antar tab (shared layout id) — efek hidup */}
      {active && (
        <motion.span
          layoutId="nav-active-pill"
          className="absolute inset-0 rounded-2xl bg-white/[0.07] dark:bg-white/[0.08]"
          transition={{ type: 'spring', stiffness: 480, damping: 34 }}
        />
      )}
      <Icon
        className={cn(
          'relative z-10 h-[21px] w-[21px] transition-colors',
          active ? 'text-[var(--brand)]' : 'text-stone-400 dark:text-zinc-500',
        )}
        fill={active ? 'currentColor' : 'none'}
        strokeWidth={active ? 2.25 : 2}
      />
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
    </motion.div>
  )
}

export function BottomNav({ isOwner, user }: { isOwner?: boolean; user?: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isActive = (href: string) => isRouteActive(pathname, href)

  async function handleLogout() {
    await signOut()
    router.push('/')
    router.refresh()
  }

  const perms = parsePerms(user?.permissions)

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

  const displayName = user?.nickname || user?.name || 'Admin'

  return (
    <>
      {/* Command palette (search) — dibuka via tombol Search di bawah / Cmd+K */}
      <CommandPalette showTrigger={false} isOwner={isOwner} perms={perms} />

      {/* Bottom bar — pill oval "glass liquid": backdrop-blur kuat + tint pekat
          supaya konten di belakang ter-blur (tak "tembus"/numpuk). SELALU terlihat */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-40 pointer-events-none"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      >
        <div className="flex justify-center px-5">
          <nav className="pointer-events-auto relative flex w-fit gap-0.5 rounded-full backdrop-blur-xl backdrop-saturate-150 bg-zinc-900/70 shadow-[0_8px_28px_rgba(0,0,0,0.28)] p-1">
            <div className="flex gap-0.5">
              {leftNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className="flex h-[52px] w-[60px] items-center justify-center"
                >
                  <NavTab active={isActive(item.href)} label={item.label} icon={item.icon} />
                </Link>
              ))}

              {/* Search — TENGAH (titik fokus bottom nav), buka command palette */}
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('ocm-open-search'))}
                aria-label="Cari"
                className="flex h-[52px] w-[60px] items-center justify-center"
              >
                <NavTab active={false} label="Cari" icon={Search} />
              </button>

              {rightNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className="flex h-[52px] w-[60px] items-center justify-center"
                >
                  <NavTab active={isActive(item.href)} label={item.label} icon={item.icon} />
                </Link>
              ))}

              {/* Lainnya — gerbang ke semua halaman sekunder + akun (drawer) */}
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Lainnya"
                className="flex h-[52px] w-[60px] items-center justify-center"
              >
                <NavTab active={drawerOpen} label="Lainnya" icon={Menu} />
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

              {/* User */}
              {user && (
                <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <ProfileDialog user={user}>
                    <button className="flex flex-1 items-center gap-3 text-left outline-none cursor-pointer min-w-0">
                      {user.image ? (
                        <img src={fotoUrl(user.image)} className="h-10 w-10 rounded-full object-cover shrink-0" alt="Avatar" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-stone-800 dark:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-white dark:text-zinc-200 shrink-0">
                          {getInitials(displayName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[11px] text-stone-400 dark:text-zinc-500">{getGreeting()},</p>
                        <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100 truncate -mt-0.5">{displayName}</p>
                        <p className="text-[10px] text-stone-400 dark:text-zinc-500 truncate mt-0.5">{formatTanggalLengkap(new Date())}</p>
                      </div>
                    </button>
                  </ProfileDialog>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Tutup"
                    className="ml-auto p-2 rounded-lg text-stone-400 dark:text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Shortcut grid — hanya halaman yang tidak ada di bottom bar */}
              <div className="px-4 py-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
                  Pintasan
                </p>
                <ShortcutGrid isOwner={isOwner} perms={perms} onNavigate={() => setDrawerOpen(false)} excludePrimary />
              </div>

              {/* Logout */}
              <div className="px-4 pb-4 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Keluar</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
