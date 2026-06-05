'use client'

import { usePathname } from 'next/navigation'

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

export function MobileHeader() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="md:hidden flex items-center h-14 px-4 gap-3 shrink-0 bg-stone-50/95 backdrop-blur-md border-b border-stone-200/50">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-600 text-white text-[10px] font-bold shrink-0 shadow-sm shadow-orange-600/25">
        OCM
      </div>
      <span className="flex-1 text-base font-semibold text-stone-900 tracking-tight truncate">
        {title}
      </span>
    </header>
  )
}
