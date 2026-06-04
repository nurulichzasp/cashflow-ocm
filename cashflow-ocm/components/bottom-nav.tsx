'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Menu,
  X,
  Receipt,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'

const primaryNav = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/pembelian',  label: 'Pembelian',  icon: ShoppingCart },
  { href: '/penjualan',  label: 'Penjualan',  icon: TrendingUp },
  { href: '/kas',        label: 'Kas',        icon: Wallet },
]

const moreNav = [
  { href: '/biaya',      label: 'Biaya',       icon: Receipt },
  { href: '/peron',      label: 'Peron',       icon: Users },
  { href: '/harga',      label: 'Harga',       icon: DollarSign },
  { href: '/laporan',    label: 'Laporan',     icon: BarChart3 },
  { href: '/pengaturan', label: 'Pengaturan',  icon: Settings, ownerOnly: true },
]

function getInitials(name?: string) {
  if (!name) return 'U'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function BottomNav({ isOwner, userName }: { isOwner?: boolean; userName?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  const isMoreActive = moreNav.some((item) => isActive(item.href))

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const visibleMore = moreNav.filter((item) => !item.ownerOnly || isOwner)

  return (
    <>
      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-stone-200/80 flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {primaryNav.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-colors duration-150',
                active ? 'text-orange-600' : 'text-stone-400'
              )}
            >
              <item.icon className={cn('h-5 w-5 shrink-0', active && 'stroke-[2.2px]')} />
              <span className={cn('text-[10px] font-medium leading-none', active && 'font-semibold')}>
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* Menu button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-colors duration-150',
            isMoreActive ? 'text-orange-600' : 'text-stone-400'
          )}
        >
          <Menu className={cn('h-5 w-5 shrink-0', isMoreActive && 'stroke-[2.2px]')} />
          <span className={cn('text-[10px] font-medium leading-none', isMoreActive && 'font-semibold')}>
            Menu
          </span>
        </button>
      </nav>

      {/* Drawer overlay for "More" */}
      <div
        className={cn('fixed inset-0 z-50 md:hidden overflow-hidden', !drawerOpen && 'pointer-events-none')}
        aria-hidden={!drawerOpen}
      >
        {/* Backdrop */}
        <div
          className={cn(
            'absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200',
            drawerOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setDrawerOpen(false)}
        />

        {/* Sheet dari bawah */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl flex flex-col',
            'transition-transform',
            drawerOpen ? 'translate-y-0' : 'translate-y-full'
          )}
          style={{
            transitionDuration: drawerOpen ? '300ms' : '220ms',
            transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-stone-200" />
          </div>

          {/* User info */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-stone-100">
            <div className="h-9 w-9 rounded-full bg-orange-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
              {getInitials(userName)}
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900">{userName}</p>
              <p className="text-xs text-stone-400">{isOwner ? 'Owner' : 'Admin'}</p>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="ml-auto p-2 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Nav items */}
          <div className="px-3 py-2">
            {visibleMore.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-xl transition-colors duration-150',
                    active
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-stone-700 hover:bg-stone-50'
                  )}
                >
                  <item.icon className={cn('h-5 w-5 shrink-0', active ? 'text-orange-600' : 'text-stone-400')} />
                  <span className={cn('text-sm', active ? 'font-semibold' : 'font-medium')}>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Logout */}
          <div className="px-3 pb-3 pt-1 border-t border-stone-100 mt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors duration-150"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
