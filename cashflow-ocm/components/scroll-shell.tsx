'use client'

import { MobileHeader } from '@/components/mobile-header'

/**
 * ScrollShell — kontainer scroll konten + header mobile.
 * Header: TRANSPARAN TOTAL — tanpa bg, tanpa blur, tanpa gradient/shadow.
 * Cuma logo + judul halaman; konten scroll lewat di belakangnya. SELALU
 * terlihat. (Blur & gradient dihapus: bikin seam/garis di iOS; keputusan user.)
 */
export function ScrollShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="md:hidden fixed inset-x-0 top-0 z-30 pointer-events-none">
        <div style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <MobileHeader />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto bg-background px-4 pt-[calc(64px+env(safe-area-inset-top))] pb-32 md:p-6">
        <div className="app-container">{children}</div>
      </main>
    </div>
  )
}
