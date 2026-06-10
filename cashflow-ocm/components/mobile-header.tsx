'use client'

import { cn } from '@/lib/utils'

export const PAGE_TITLES: Record<string, string> = {
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

export function getPageTitle(pathname: string): string {
  for (const [key, title] of Object.entries(PAGE_TITLES)) {
    if (pathname === key || (key !== '/dashboard' && pathname.startsWith(key))) {
      return title
    }
  }
  return 'Dashboard'
}

/** Large Title hanya untuk route level atas (persis); sub-route pakai bar compact. */
export function isTopRoute(pathname: string): boolean {
  return Object.prototype.hasOwnProperty.call(PAGE_TITLES, pathname)
}

/**
 * MobileHeader — bar navigasi compact ala iOS.
 * Judul tengah muncul (fade + naik) saat Large Title ter-scroll lewat,
 * atau selalu tampil di sub-route.
 */
export function MobileHeader({ title, showTitle }: { title: string; showTitle: boolean }) {
  return (
    <header className="relative flex h-12 items-center px-4">
      {/* Monogram OCM — kiri */}
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-solid)] text-[11px] font-bold tracking-tight text-white">
        OCM
      </div>
      {/* Judul compact — center, transisi ala iOS */}
      <span
        className={cn(
          'pointer-events-none absolute left-1/2 z-0 max-w-[60%] -translate-x-1/2 truncate text-center text-headline font-semibold text-foreground transition-all duration-200',
          showTitle ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0',
        )}
      >
        {title}
      </span>
    </header>
  )
}
