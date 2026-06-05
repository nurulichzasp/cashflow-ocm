'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  Receipt,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { ProfileDialog } from '@/components/profile-dialog'
import { fotoUrl } from '@/lib/foto-url'

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/pembelian',   label: 'Pembelian',    icon: ShoppingCart },
  { href: '/penjualan',   label: 'Penjualan',    icon: TrendingUp },
  { href: '/peron',       label: 'Peron',        icon: Users },
  { href: '/kas',         label: 'Buku Kas',     icon: Wallet },
  { href: '/biaya',       label: 'Biaya',        icon: Receipt },
  { href: '/harga',       label: 'Harga Acuan',  icon: DollarSign },
  { href: '/laporan',     label: 'Laporan',      icon: BarChart3 },
  { href: '/pengaturan',  label: 'Pengaturan',   icon: Settings },
]

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 mx-2 rounded-lg px-3 py-2.5 text-sm transition-all duration-150',
        active
          ? 'bg-[#D97757]/12 text-[#D97757] font-semibold'
          : 'text-[#9CA3AF] font-medium hover:bg-white/[0.06] hover:text-[#F3F4F6]'
      )}
    >
      {active && (
        <span className="absolute left-0 top-[7px] bottom-[7px] w-[3px] rounded-full bg-[#D97757]" style={{ boxShadow: '0 0 6px oklch(0.65 0.2 41 / 0.5)' }} />
      )}
      <Icon className={cn('h-[17px] w-[17px] shrink-0 transition-colors', active ? 'text-[#D97757]' : '')} />
      {label}
    </Link>
  )
}

function getInitials(name?: string): string {
  if (!name) return 'U'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function Sidebar({ user, isOwner, onToggle }: { user?: any; isOwner?: boolean; onToggle?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  let perms = { pembelian: true, penjualan: true, kas: true, biaya: true }
  if (user?.permissions) {
    try {
      perms = JSON.parse(user.permissions)
    } catch {}
  }

  const visibleNavItems = navItems.filter((item) => {
    if (isOwner) return true
    if (item.href === '/pengaturan') return false
    if (item.href === '/pembelian' && perms.pembelian === false) return false
    if (item.href === '/penjualan' && perms.penjualan === false) return false
    if (item.href === '/kas' && perms.kas === false) return false
    if (item.href === '/biaya' && perms.biaya === false) return false
    return true
  })

  return (
    <aside className="flex h-full w-60 flex-col bg-[#1E1E1E] border-r border-white/[0.06]">
      {/* Brand */}
      <div className="flex h-14 items-center border-b border-white/[0.06] px-4 gap-3 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D97757] text-white text-[11px] font-bold shrink-0">
          OCM
        </div>
        <span className="font-semibold text-sm text-[#F3F4F6] truncate tracking-wide">CV OCM Cashflow</span>
        {onToggle && (
          <button
            onClick={onToggle}
            className="ml-auto -mr-1 p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-white/[0.06] transition-colors shrink-0"
            title="Sembunyikan sidebar"
            aria-label="Sembunyikan sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            }
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.06] p-3 space-y-1 shrink-0">
        {user && (
          <ProfileDialog user={user}>
            <button className="w-full flex items-center gap-2.5 px-3 py-2 mb-0.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] transition-colors text-left outline-none cursor-pointer">
              {user.image ? (
                <img src={fotoUrl(user.image)} className="h-7 w-7 rounded-full object-cover shrink-0" alt="Avatar" />
              ) : (
                <div className="h-7 w-7 rounded-full bg-[#D97757] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                  {getInitials(user.nickname || user.name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#F3F4F6] truncate">{user.nickname || user.name}</p>
                <p className="text-[11px] text-[#9CA3AF] capitalize">{user.role}</p>
              </div>
            </button>
          </ProfileDialog>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#9CA3AF] hover:text-red-400 hover:bg-red-500/8 transition-colors duration-150 font-medium cursor-pointer"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Keluar
        </button>
      </div>
    </aside>
  )
}

export function MobileSidebar({ user, isOwner }: { user?: any; isOwner?: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  let perms = { pembelian: true, penjualan: true, kas: true, biaya: true }
  if (user?.permissions) {
    try {
      perms = JSON.parse(user.permissions)
    } catch {}
  }

  const visibleNavItems = navItems.filter((item) => {
    if (isOwner) return true
    if (item.href === '/pengaturan') return false
    if (item.href === '/pembelian' && perms.pembelian === false) return false
    if (item.href === '/penjualan' && perms.penjualan === false) return false
    if (item.href === '/kas' && perms.kas === false) return false
    if (item.href === '/biaya' && perms.biaya === false) return false
    return true
  })

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden text-stone-600 active:scale-100"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Always rendered — CSS transition in/out */}
      <div
        className={cn('fixed inset-0 z-50 md:hidden overflow-hidden', !open && 'pointer-events-none')}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          className={cn(
            'absolute inset-0 bg-black/60 backdrop-blur-[2px]',
            'transition-opacity duration-200',
            open ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setOpen(false)}
        />

        {/* Drawer panel */}
        <div
          className={cn(
            'absolute left-0 top-0 h-full w-[280px] bg-[#1E1E1E] shadow-2xl flex flex-col',
            'transition-transform',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
          style={{
            transitionDuration: open ? '280ms' : '220ms',
            transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          {/* Brand */}
          <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D97757] text-white text-[11px] font-bold shrink-0">
                OCM
              </div>
              <span className="font-semibold text-sm text-stone-100">CV OCM Cashflow</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800/60 transition-colors duration-150 -mr-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))
                }
                onClick={() => setOpen(false)}
              />
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-white/[0.06] p-3 space-y-1 shrink-0">
            {user && (
              <ProfileDialog user={user}>
                <button className="w-full flex items-center gap-2.5 px-3 py-1.5 mb-1 text-left outline-none cursor-pointer">
                  {user.image ? (
                    <img src={fotoUrl(user.image)} className="h-7 w-7 rounded-full object-cover shrink-0" alt="Avatar" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-[#D97757] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                      {getInitials(user.nickname || user.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-stone-200 truncate">{user.nickname || user.name}</p>
                    <p className="text-[11px] text-stone-500 capitalize">{user.role}</p>
                  </div>
                </button>
              </ProfileDialog>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-stone-500 hover:text-red-400 hover:bg-stone-800/60 transition-colors duration-150 font-medium cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Keluar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
