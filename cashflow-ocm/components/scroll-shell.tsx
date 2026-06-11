'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { MobileHeader, isFullscreenRoute } from '@/components/mobile-header'
import { setNavCompact } from '@/lib/nav-visibility-store'
import { cn } from '@/lib/utils'

/**
 * ScrollShell — kontainer scroll konten + header mobile.
 * Header: LIQUID GLASS — translucent + backdrop-blur + saturate + hairline bawah
 * tipis. Frosting menutup safe-area + bar (logo + judul); konten scroll ter-blur
 * di belakangnya. SELALU terlihat. (Permintaan user: beri glass liquid blur.)
 */
export function ScrollShell({ children, user }: { children: React.ReactNode; user?: { name?: string; nickname?: string | null; image?: string | null } }) {
  const mainRef = useRef<HTMLElement>(null)
  const pathname = usePathname()
  const fullscreen = isFullscreenRoute(pathname)

  // Bar bawah mengecil saat scroll ke bawah, kembali penuh saat scroll ke atas /
  // di puncak (gaya Instagram). Listener di <main> (wadah scroll, bukan window).
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    let lastY = el.scrollTop
    let ticking = false
    const THRESH = 10 // abaikan scroll kecil agar tak flicker

    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const el2 = mainRef.current
        if (!el2) { ticking = false; return }
        const max = el2.scrollHeight - el2.clientHeight
        // clamp → buang rubber-band Safari (scrollTop < 0 atau > max)
        const y = Math.max(0, Math.min(el2.scrollTop, max))
        const dy = y - lastY
        if (y <= 8) {
          setNavCompact(false) // di puncak → selalu penuh
        } else if (Math.abs(dy) > THRESH) {
          setNavCompact(dy > 0) // turun → compact, naik → penuh
        }
        lastY = y
        ticking = false
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      setNavCompact(false) // reset saat pindah halaman
    }
  }, [])

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="md:hidden fixed inset-x-0 top-0 z-30 pointer-events-none">
        <div
          className="backdrop-blur-xl backdrop-saturate-150 bg-background/55 border-b border-black/[0.05] dark:border-white/[0.06]"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <MobileHeader user={user} />
        </div>
      </div>

      <main
        ref={mainRef}
        className={cn(
          'flex-1 overflow-y-auto bg-background px-4 pt-[calc(64px+env(safe-area-inset-top))] md:p-6',
          fullscreen ? 'pb-8' : 'pb-32',
        )}
      >
        <div className="app-container md:mx-auto md:max-w-[1320px]">{children}</div>
      </main>
    </div>
  )
}
