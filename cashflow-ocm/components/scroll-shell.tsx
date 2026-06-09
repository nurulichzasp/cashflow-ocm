'use client'

import { useState, useRef, useCallback } from 'react'
import { MobileHeader } from '@/components/mobile-header'
import { setNavVisible } from '@/lib/nav-visibility-store'

export function ScrollShell({
  children,
  isOwner,
  perms,
}: {
  children: React.ReactNode
  isOwner?: boolean
  perms?: { pembelian?: boolean; penjualan?: boolean; kas?: boolean; biaya?: boolean }
}) {
  const [headerVisible, setHeaderVisible] = useState(true)
  const lastY = useRef(0)
  const rafId = useRef<number | null>(null)

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget
    if (rafId.current !== null) return
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null
      const y = target.scrollTop
      const dy = y - lastY.current
      if (dy > 12 && y > 56) {
        setHeaderVisible(false)
        setNavVisible(false)
      } else if (dy < -8 || y < 16) {
        setHeaderVisible(true)
        setNavVisible(true)
      }
      lastY.current = y
    })
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden relative">
      {/* Premium glass header — solid blur, no gradient bleed */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30 pointer-events-none"
        style={{
          willChange: 'transform, opacity',
          transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
          opacity: headerVisible ? 1 : 0,
          transition:
            'transform 280ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 220ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        }}
      >
        {/* paddingTop = safe-area-inset-top: header mengisi BELAKANG status bar /
            Dynamic Island (full-bleed), isi header turun ke bawahnya. Bg SOLID
            `bg-background` = sama persis dgn body/html → status bar ↔ header
            seamless, tanpa beda shade/garis (bukan glass translucent lagi). */}
        <div
          className="pointer-events-auto bg-background border-b border-black/5 dark:border-white/[0.06]"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <MobileHeader isOwner={isOwner} perms={perms} />
        </div>
      </div>

      <main
        onScroll={onScroll}
        className="flex-1 overflow-y-auto bg-background px-4 pt-[calc(64px+env(safe-area-inset-top))] pb-32 md:p-6"
      >
        <div className="app-container">{children}</div>
      </main>
    </div>
  )
}
