'use client'

import { useState, useRef, useCallback } from 'react'
import { MobileHeader } from '@/components/mobile-header'

export function ScrollShell({ children }: { children: React.ReactNode }) {
  const [headerVisible, setHeaderVisible] = useState(true)
  const lastY = useRef(0)

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const y = e.currentTarget.scrollTop
    const dy = y - lastY.current
    if (dy > 8 && y > 56) setHeaderVisible(false)
    else if (dy < -5 || y < 10) setHeaderVisible(true)
    lastY.current = y
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Fixed glass header — animates with transform+opacity, no layout shift */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30"
        style={{
          transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
          opacity: headerVisible ? 1 : 0,
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease',
        }}
      >
        <MobileHeader />
      </div>

      <main
        onScroll={onScroll}
        className="flex-1 overflow-y-auto bg-stone-50 px-4 pt-[72px] pb-24 md:p-6"
      >
        <div className="app-container">
          {children}
        </div>
      </main>
    </div>
  )
}
