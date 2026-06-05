'use client'

import { useState, useRef, useCallback } from 'react'
import { MobileHeader } from '@/components/mobile-header'

export function ScrollShell({ children }: { children: React.ReactNode }) {
  const [headerVisible, setHeaderVisible] = useState(true)
  const lastY = useRef(0)

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const y = e.currentTarget.scrollTop
    const dy = y - lastY.current
    if (dy > 6 && y > 60) setHeaderVisible(false)
    else if (dy < -6 || y < 10) setHeaderVisible(true)
    lastY.current = y
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Mobile header — hides on scroll down, shows on scroll up */}
      <div
        className="md:hidden shrink-0 overflow-hidden transition-[height] duration-300"
        style={{
          height: headerVisible ? '56px' : '0px',
          transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <MobileHeader />
      </div>

      <main
        onScroll={onScroll}
        className="flex-1 overflow-y-auto bg-stone-50 p-4 pb-24 md:pb-6 md:p-6"
      >
        <div className="app-container">
          {children}
        </div>
      </main>
    </div>
  )
}
