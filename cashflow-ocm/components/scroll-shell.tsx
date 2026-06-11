'use client'

import { MobileHeader } from '@/components/mobile-header'

/**
 * ScrollShell — kontainer scroll konten + header mobile.
 * Header: LIQUID GLASS — translucent + backdrop-blur + saturate + hairline bawah
 * tipis. Frosting menutup safe-area + bar (logo + judul); konten scroll ter-blur
 * di belakangnya. SELALU terlihat. (Permintaan user: beri glass liquid blur.)
 */
export function ScrollShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="md:hidden fixed inset-x-0 top-0 z-30 pointer-events-none">
        <div
          className="backdrop-blur-xl backdrop-saturate-150 bg-background/55 border-b border-black/[0.05] dark:border-white/[0.06]"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <MobileHeader />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto bg-background px-4 pt-[calc(64px+env(safe-area-inset-top))] pb-32 md:p-6">
        <div className="app-container md:mx-auto md:max-w-[1320px]">{children}</div>
      </main>
    </div>
  )
}
