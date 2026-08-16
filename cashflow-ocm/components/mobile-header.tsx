'use client'
/* eslint-disable @next/next/no-img-element -- avatar memakai proxy foto privat terautentikasi */

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { resolvePageTitle } from '@/lib/nav-routes'
import { fotoUrl } from '@/lib/foto-url'

function getInitials(name?: string | null): string {
  if (!name) return 'U'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

/** Route full-screen (tanpa bottom nav, header = tombol back). */
export function isFullscreenRoute(pathname: string): boolean {
  return pathname === '/profil' || pathname.startsWith('/pengaturan')
}

type HeaderUser = { name?: string; nickname?: string | null; image?: string | null }

export function MobileHeader({ user }: { user?: HeaderUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const title = resolvePageTitle(pathname) ?? 'Dashboard'
  const displayName = user?.nickname || user?.name
  const fullscreen = isFullscreenRoute(pathname)

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/dashboard')
  }

  return (
    <header className="relative flex items-center h-14 px-4">
      {fullscreen ? (
        /* Tombol kembali — lingkaran glass translucent (gaya Settings iOS/IG). */
        <button
          onClick={handleBack}
          aria-label="Kembali"
          className="tap-pad pointer-events-auto relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/[0.06] bg-black/[0.04] backdrop-blur-md text-stone-700 transition-transform active:scale-95 dark:border-white/[0.10] dark:bg-white/[0.08] dark:text-zinc-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      ) : (
        /* Logo OCM = tombol Beranda (→ /dashboard). */
        <Link
          href="/dashboard"
          aria-label="Beranda"
          className="tap-pad pointer-events-auto relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-solid)] text-[11px] font-bold tracking-tight text-white shadow-sm transition-transform active:scale-95"
        >
          OCM
        </Link>
      )}

      {/* Judul — center absolut terhadap lebar layar */}
      <span className="pointer-events-none absolute left-1/2 z-0 max-w-[55%] -translate-x-1/2 truncate text-center text-lg font-semibold tracking-tight text-stone-900 dark:text-zinc-100">
        {title}
      </span>

      {/* Avatar profil (kanan) — hanya di halaman normal; di full-screen kita di dalam profil/setting. */}
      {!fullscreen && (
        <Link href="/profil" aria-label="Profil" className="tap-pad pointer-events-auto relative z-10 ml-auto shrink-0">
          {user?.image ? (
            <img src={fotoUrl(user.image)} alt="Profil" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="grid h-8 w-8 place-items-center rounded-full bg-stone-200 text-[11px] font-bold text-stone-600 dark:bg-white/[0.10] dark:text-zinc-200">
              {getInitials(displayName)}
            </div>
          )}
        </Link>
      )}
    </header>
  )
}
