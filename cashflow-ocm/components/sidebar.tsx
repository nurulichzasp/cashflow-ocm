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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

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
        'flex items-center gap-3 mx-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
        active
          ? 'bg-orange-600 text-white'
          : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {label}
    </Link>
  )
}

function getInitials(name?: string): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function Sidebar({ userName, isOwner }: { userName?: string; isOwner?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const visibleNavItems = navItems.filter((item) => {
    if (item.href === '/pengaturan') return isOwner
    return true
  })

  return (
    <aside className="flex h-full w-60 flex-col bg-stone-900 border-r border-stone-800">
      {/* Brand */}
      <div className="flex h-14 items-center border-b border-stone-800 px-4 gap-3 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white text-[11px] font-bold shrink-0">
          OCM
        </div>
        <span className="font-semibold text-sm text-stone-100 truncate">CV OCM Cashflow</span>
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
      <div className="border-t border-stone-800 p-3 space-y-1 shrink-0">
        {userName && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 mb-1">
            <div className="h-7 w-7 rounded-full bg-orange-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {getInitials(userName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-stone-200 truncate">{userName}</p>
              <p className="text-[11px] text-stone-500">{isOwner ? 'Owner' : 'Admin'}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2.5 text-stone-400 hover:text-red-400 hover:bg-stone-800"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </Button>
      </div>
    </aside>
  )
}

export function MobileSidebar({ userName, isOwner }: { userName?: string; isOwner?: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const visibleNavItems = navItems.filter((item) => {
    if (item.href === '/pengaturan') return isOwner
    return true
  })

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden text-stone-600"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-stone-900 shadow-2xl flex flex-col">
            {/* Brand */}
            <div className="flex h-14 items-center justify-between border-b border-stone-800 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white text-[11px] font-bold shrink-0">
                  OCM
                </div>
                <span className="font-semibold text-sm text-stone-100">CV OCM Cashflow</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-stone-400 hover:text-stone-100 hover:bg-stone-800 -mr-1"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
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
            <div className="border-t border-stone-800 p-3 space-y-1">
              {userName && (
                <div className="flex items-center gap-2.5 px-3 py-1.5 mb-1">
                  <div className="h-7 w-7 rounded-full bg-orange-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                    {getInitials(userName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-200 truncate">{userName}</p>
                    <p className="text-[11px] text-stone-500">{isOwner ? 'Owner' : 'Admin'}</p>
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2.5 text-stone-400 hover:text-red-400 hover:bg-stone-800"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
