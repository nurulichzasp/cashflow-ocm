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
      {/* Floating header — no background, just content */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30"
        style={{
          willChange: 'transform, opacity',
          transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
          opacity: headerVisible ? 1 : 0,
          transition: 'transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {/* Gradient backdrop for header readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F5F5F4]/95 via-[#F5F5F4]/70 to-transparent dark:from-[#0A0A0A]/95 dark:via-[#0A0A0A]/70 dark:to-transparent pointer-events-none" />
        <MobileHeader isOwner={isOwner} perms={perms} />
      </div>

      {/* Bottom gradient — smooths content behind floating bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-28 pointer-events-none bg-gradient-to-t from-[#F5F5F4]/90 via-[#F5F5F4]/40 to-transparent dark:from-[#0A0A0A]/90 dark:via-[#0A0A0A]/40 dark:to-transparent" />

      <main
        onScroll={onScroll}
        className="flex-1 overflow-y-auto bg-background px-4 pt-[72px] pb-32 md:p-6"
      >
        <div className="app-container">
          {children}
        </div>
      </main>
    </div>
  )
}
