'use client'

import { useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { MobileHeader, getPageTitle, isTopRoute } from '@/components/mobile-header'

/**
 * ScrollShell — kontainer scroll + navigation bar iOS dengan Large Title.
 *
 * Di atas: Large Title 34px bold di alur konten. Saat di-scroll melewatinya,
 * bar atas berubah jadi material blur (saturate 180% + blur 20px) dengan
 * hairline bawah dan judul compact di tengah — persis perilaku app bawaan iOS.
 * Sub-route (pengaturan/*, peron/[id]) memakai bar compact permanen.
 */
export function ScrollShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)
  const hasLargeTitle = isTopRoute(pathname)
  const [collapsed, setCollapsed] = useState(false)
  const collapsedRef = useRef(false)

  function onScroll(e: React.UIEvent<HTMLElement>) {
    const next = e.currentTarget.scrollTop > 30
    if (next !== collapsedRef.current) {
      collapsedRef.current = next
      setCollapsed(next)
    }
  }

  const barActive = collapsed || !hasLargeTitle

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="fixed inset-x-0 top-0 z-30 md:hidden pointer-events-none">
        <div
          className={cn(
            'transition-colors duration-200',
            barActive ? 'ios-bar hairline-b' : 'bg-transparent',
          )}
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <MobileHeader title={title} showTitle={barActive} />
        </div>
      </div>

      <main
        onScroll={onScroll}
        className="flex-1 overflow-y-auto overscroll-contain bg-background px-4 pt-[calc(48px+env(safe-area-inset-top))] pb-32 md:p-6"
      >
        <div className="app-container md:mx-auto md:max-w-[1320px]">
          {hasLargeTitle && (
            <h1 className="pb-2 pt-1 text-large-title font-bold tracking-tight text-foreground md:hidden">
              {title}
            </h1>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}
