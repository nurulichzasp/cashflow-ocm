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
    <header className="relative flex items-center h-14 px-4">
      {/* Logo OCM — kiri */}
      <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-solid)] text-white text-[11px] font-bold tracking-tight shrink-0 shadow-sm">
        OCM
      </div>
      {/* Judul — center absolut terhadap lebar layar */}
      <span className="pointer-events-none absolute left-1/2 z-0 max-w-[60%] -translate-x-1/2 truncate text-center text-lg font-semibold tracking-tight text-stone-900 dark:text-zinc-100">
        {title}
      </span>
    </header>
  )
}
