'use client'

import { usePathname } from 'next/navigation'
import { CommandPalette } from '@/components/command-palette'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pembelian': 'Pembelian',
  '/penjualan': 'Penjualan',
  '/peron': 'Peron',
  '/kas': 'Buku Kas',
  '/biaya': 'Biaya',
  '/harga': 'Harga Acuan',
  '/laporan': 'Laporan',
  '/pengaturan': 'Pengaturan',
}

function getPageTitle(pathname: string): string {
  for (const [key, title] of Object.entries(PAGE_TITLES)) {
    if (pathname === key || (key !== '/dashboard' && pathname.startsWith(key))) {
      return title
    }
  }
  return 'Dashboard'
}

export function MobileHeader({
  isOwner,
  perms,
}: {
  isOwner?: boolean
  perms?: { pembelian?: boolean; penjualan?: boolean; kas?: boolean; biaya?: boolean }
}) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="flex items-center h-14 px-4 gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] dark:bg-white/[0.06] border border-white/[0.08] text-stone-700 dark:text-zinc-300 text-[10px] font-bold tracking-tight shrink-0">
        OCM
      </div>
      <span className="flex-1 text-[15px] font-semibold text-stone-900 dark:text-zinc-100 tracking-tight truncate">
        {title}
      </span>
      <CommandPalette isOwner={isOwner} perms={perms} />
    </header>
  )
}
