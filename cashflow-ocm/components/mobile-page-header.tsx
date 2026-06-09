'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/pembelian':  'Pembelian',
  '/penjualan':  'Penjualan',
  '/peron':      'Peron',
  '/kas':        'Buku Kas',
  '/biaya':      'Biaya',
  '/harga':      'Harga Acuan',
  '/laporan':    'Laporan',
  '/pengaturan': 'Pengaturan',
}

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  for (const [route, title] of Object.entries(PAGE_TITLES)) {
    if (route !== '/dashboard' && pathname.startsWith(route)) return title
  }
  return 'CV OCM'
}

export function MobilePageHeader() {
  const pathname = usePathname()
  const title = getTitle(pathname)

  return (
    <div className="md:hidden flex h-14 items-center justify-between bg-white/96 backdrop-blur-md border-b border-stone-200/70 px-4 shrink-0 z-30">
      <Link
        href="/dashboard"
        className="flex items-center justify-center h-8 w-8 rounded-lg bg-[var(--brand-solid)] text-white text-[10px] font-bold shrink-0"
        style={{ boxShadow: '0 2px 8px rgba(14,122,87,0.35)' }}
      >
        OCM
      </Link>
      <span className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold text-stone-900 tracking-tight pointer-events-none">
        {title}
      </span>
    </div>
  )
}
