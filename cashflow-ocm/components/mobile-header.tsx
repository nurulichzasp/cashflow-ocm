'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { resolvePageTitle } from '@/lib/nav-routes'
import { fotoUrl } from '@/lib/foto-url'

function getInitials(name?: string | null): string {
  if (!name) return 'U'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

type HeaderUser = { name?: string; nickname?: string | null; image?: string | null }

export function MobileHeader({ user }: { user?: HeaderUser }) {
  const pathname = usePathname()
  const title = resolvePageTitle(pathname) ?? 'Dashboard'
  const displayName = user?.nickname || user?.name

  return (
    <header className="relative flex items-center h-14 px-4">
      {/* Logo OCM — kiri */}
      <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-solid)] text-white text-[11px] font-bold tracking-tight shrink-0 shadow-sm">
        OCM
      </div>
      {/* Judul — center absolut terhadap lebar layar */}
      <span className="pointer-events-none absolute left-1/2 z-0 max-w-[55%] -translate-x-1/2 truncate text-center text-lg font-semibold tracking-tight text-stone-900 dark:text-zinc-100">
        {title}
      </span>
      {/* Avatar profil — kanan, → /profil. Fallback inisial NETRAL (bukan biru). */}
      <Link
        href="/profil"
        aria-label="Profil"
        className="pointer-events-auto relative z-10 ml-auto shrink-0"
      >
        {user?.image ? (
          <img src={fotoUrl(user.image)} alt="Profil" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="grid h-8 w-8 place-items-center rounded-full bg-stone-200 text-[11px] font-bold text-stone-600 dark:bg-white/[0.10] dark:text-zinc-200">
            {getInitials(displayName)}
          </div>
        )}
      </Link>
    </header>
  )
}
