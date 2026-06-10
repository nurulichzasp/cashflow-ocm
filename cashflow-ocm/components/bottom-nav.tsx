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
  UserCircle,
  X,
  LogOut,
} from 'lucide-react'
import { ProfileDialog } from '@/components/profile-dialog'
import { ShortcutGrid } from '@/components/shortcut-grid'
import { CommandPalette } from '@/components/command-palette'
import { fotoUrl } from '@/lib/foto-url'
import { parsePerms } from '@/lib/nav-routes'

const primaryNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: undefined },
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

/** Tab iOS: ikon + label 10px, tint emerald saat aktif, abu saat tidak. */
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
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="flex h-full w-full flex-col items-center justify-center gap-[3px] pt-1.5 pb-1"
    >
      <Icon
        className={cn(
          'h-6 w-6 transition-colors',
          active ? 'text-[var(--brand)]' : 'text-muted-foreground',
        )}
        fill={active ? 'currentColor' : 'none'}
        strokeWidth={active ? 2.1 : 1.8}
      />
      <span
        className={cn(
          'text-[10px] leading-none transition-colors',
          active ? 'font-medium text-[var(--brand)]' : 'text-muted-foreground',
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

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const perms = parsePerms(user?.permissions)

  // Search di TENGAH: Dashboard · Pembelian · Cari · Penjualan · Profil
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
      {/* Command palette (search) — dibuka via tab Cari / Cmd+K */}
      <CommandPalette showTrigger={false} isOwner={isOwner} perms={perms} />

      {/* Tab bar iOS: material blur full-width + hairline atas + safe area bawah */}
      <div
        className="ios-bar hairline-t fixed bottom-0 inset-x-0 z-40 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <nav className="flex h-[50px] items-stretch">
          {leftNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className="min-w-0 flex-1"
            >
              <NavTab active={isActive(item.href)} label={item.label} icon={item.icon} />
            </Link>
          ))}

          <button
            onClick={() => window.dispatchEvent(new CustomEvent('ocm-open-search'))}
            aria-label="Cari"
            className="min-w-0 flex-1"
          >
            <NavTab active={false} label="Cari" icon={Search} />
          </button>

          {rightNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className="min-w-0 flex-1"
            >
              <NavTab active={isActive(item.href)} label={item.label} icon={item.icon} />
            </Link>
          ))}

          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Profil"
            className="min-w-0 flex-1"
          >
            <NavTab active={drawerOpen} label="Profil" icon={UserCircle} />
          </button>
        </nav>
      </div>

      {/* Sheet akun — solid iOS, grabber, dari bawah */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-popover"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Grabber */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="h-[5px] w-9 rounded-full bg-[rgba(120,120,128,0.35)]" />
              </div>

              {/* User */}
              {user && (
                <div className="hairline-b relative flex items-center gap-3 px-5 py-4">
                  <ProfileDialog user={user}>
                    <button className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left outline-none">
                      {user.image ? (
                        <img src={fotoUrl(user.image)} className="h-10 w-10 shrink-0 rounded-full object-cover" alt="Avatar" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-solid)] text-sm font-bold text-white">
                          {getInitials(displayName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-caption-1 text-muted-foreground">{getGreeting()},</p>
                        <p className="-mt-0.5 truncate text-subhead font-semibold text-foreground">{displayName}</p>
                      </div>
                    </button>
                  </ProfileDialog>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Tutup"
                    className="row-press ml-auto shrink-0 rounded-full bg-fill p-2 text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Shortcut grid — halaman yang tidak ada di tab bar */}
              <div className="px-4 py-4">
                <p className="mb-3 text-footnote font-medium text-muted-foreground">
                  Pintasan
                </p>
                <ShortcutGrid isOwner={isOwner} perms={perms} onNavigate={() => setDrawerOpen(false)} excludePrimary />
              </div>

              {/* Logout — merah iOS, terpisah */}
              <div className="hairline-t relative px-4 pb-4 pt-2">
                <button
                  onClick={handleLogout}
                  className="row-press flex w-full items-center justify-center gap-2 rounded-xl bg-card px-3 py-3.5 text-body font-medium text-[var(--keluar)]"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  Keluar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
