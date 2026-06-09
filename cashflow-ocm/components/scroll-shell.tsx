'use client'

import { MobileHeader } from '@/components/mobile-header'

/**
 * ScrollShell — kontainer scroll konten + header mobile.
 * Header: transparan + backdrop-blur, SELALU terlihat (tanpa scroll-aware
 * hide/show). Bg transparan → body bg tampil seamless di belakang status bar /
 * Dynamic Island. Gradient shadow di bawah header memberi kontras utk konten
 * yang lewat di belakangnya.
 */
export function ScrollShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="md:hidden fixed inset-x-0 top-0 z-30 pointer-events-none">
        <div className="relative backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <MobileHeader />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-[-28px] h-[28px]"
            style={{
              background:
                'linear-gradient(to top, transparent 0%, color-mix(in srgb, var(--background) 50%, transparent) 50%, color-mix(in srgb, var(--background) 90%, transparent) 100%)',
            }}
          />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto bg-background px-4 pt-[calc(64px+env(safe-area-inset-top))] pb-32 md:p-6">
        <div className="app-container">{children}</div>
      </main>
    </div>
  )
}
