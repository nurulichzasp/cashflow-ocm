'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { PanelLeft } from 'lucide-react'

export function DesktopSidebar({ user, isOwner }: { user?: any; isOwner?: boolean }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (localStorage.getItem('sidebar-collapsed') === '1') setCollapsed(true)
  }, [])

  function toggle() {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('sidebar-collapsed', next ? '1' : '0')
      return next
    })
  }

  return (
    <>
      {/* Collapsible rail — desktop only */}
      <div
        className="hidden md:flex shrink-0 overflow-hidden"
        style={{
          width: collapsed ? 0 : '15rem',
          transition: mounted ? 'width 0.28s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        }}
      >
        <div className="w-60 shrink-0">
          <Sidebar user={user} isOwner={isOwner} onToggle={toggle} />
        </div>
      </div>

      {/* Floating show button — appears when collapsed */}
      <button
        onClick={toggle}
        className={`hidden md:flex fixed left-3 top-3 z-40 h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground hover:bg-accent transition-all ${
          collapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none -translate-x-2'
        }`}
        title="Tampilkan sidebar"
        aria-label="Tampilkan sidebar"
        style={{ transitionDuration: '0.2s' }}
      >
        <PanelLeft className="h-4 w-4" />
      </button>
    </>
  )
}
