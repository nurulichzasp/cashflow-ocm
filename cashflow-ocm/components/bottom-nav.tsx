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
  Wallet,
  Menu as MenuIcon,
  X,
  LogOut,
} from 'lucide-react'
import { ProfileDialog } from '@/components/profile-dialog'
import { ShortcutGrid } from '@/components/shortcut-grid'
import { fotoUrl } from '@/lib/foto-url'
import { useNavVisible } from '@/lib/nav-visibility-store'
import { parsePerms } from '@/lib/nav-routes'

// Set true bila ingin label kecil di bawah ikon. DEFAULT false (gaya Instagram).
const SHOW_LABELS = false

const primaryNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: undefined },
  { href: '/pembelian', label: 'Pembelian', icon: ShoppingCart, perm: 'pembelian' as const },
  { href: '/penjualan', label: 'Penjualan', icon: TrendingUp, perm: 'penjualan' as const },
  { href: '/kas', label: 'Kas', icon: Wallet, perm: 'kas' as const },
]

function getInitials(name?: string) {
  if (!name) return 'U'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

/** Satu tab ikon — outline (inactive) → filled monokrom (active), tap feedback halus. */
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
      whileTap={{ scale: 0.9 }}
      animate={active ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="flex flex-1 flex-col items-center justify-center gap-1"
    >
      <Icon
        className={cn(
          'h-[26px] w-[26px] transition-colors',
          active ? 'text-stone-900 dark:text-[#FAFAFA]' : 'text-stone-400 dark:text-zinc-500',
        )}
        // Active = "terisi" (gaya IG). Untuk ikon garis (mis. TrendingUp) fill
        // tidak terlihat, jadi stroke ditebalkan agar tetap menonjol.
        fill={active ? 'currentColor' : 'none'}
        strokeWidth={active ? 2.25 : 2}
      />
      {SHOW_LABELS && (
        <span
          className={cn(
            'text-[10px] leading-none',
            active
              ? 'font-semibold text-stone-900 dark:text-[#FAFAFA]'
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
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navVisible = useNavVisible()

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const perms = parsePerms(user?.permissions)

  const visiblePrimary = primaryNav.filter((item) => {
    if (isOwner) return true
    if (item.perm && perms[item.perm] === false) return false
    return true
  })

  const displayName = user?.nickname || user?.name || 'Admin'

  return (
    <>
      {/* ── Bottom bar — flush full-width, solid, monokrom (gaya Instagram) ── */}
      <motion.nav
        initial={false}
        animate={navVisible ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white dark:border-white/10 dark:bg-black"
      >
        <div
          className="flex h-14 items-stretch justify-around px-2"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {visiblePrimary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className="flex flex-1 items-center justify-center"
            >
              <NavTab active={isActive(item.href)} label={item.label} icon={item.icon} />
            </Link>
          ))}

          {/* Menu — app launcher */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Menu"
            className="flex flex-1 items-center justify-center"
          >
            <NavTab active={drawerOpen} label="Menu" icon={MenuIcon} />
          </button>
        </div>
      </motion.nav>

      {/* ── Drawer "Menu" — bottom sheet minimalist + Shortcut Grid ── */}
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
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-black/10 bg-white dark:border-white/10 dark:bg-[#1E1E1E]"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-stone-300 dark:bg-zinc-700" />
              </div>

              {/* User */}
              {user && (
                <div className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <ProfileDialog user={user}>
                    <button className="flex flex-1 items-center gap-3 text-left outline-none cursor-pointer">
                      {user.image ? (
                        <img src={fotoUrl(user.image)} className="h-9 w-9 rounded-full object-cover shrink-0" alt="Avatar" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-orange-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                          {getInitials(displayName)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100">{displayName}</p>
                        <p className="text-xs text-stone-400 dark:text-zinc-500 capitalize">{user.role}</p>
                      </div>
                    </button>
                  </ProfileDialog>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Tutup"
                    className="ml-auto p-2 rounded-lg text-stone-400 dark:text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Shortcut grid — semua halaman, sekali tap */}
              <div className="px-4 py-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
                  Pintasan
                </p>
                <ShortcutGrid isOwner={isOwner} perms={perms} onNavigate={() => setDrawerOpen(false)} />
              </div>

              {/* Logout */}
              <div className="px-4 pb-4 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-red-500 hover:bg-red-500/10 transition-colors"
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
