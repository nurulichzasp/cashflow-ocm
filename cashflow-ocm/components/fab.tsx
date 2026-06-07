'use client'

import { Plus } from 'lucide-react'

/**
 * FloatingFab — trigger liquid-glass untuk dialog form tambah.
 * Posisi: fixed bottom-right, selalu di atas bottom nav, z-41.
 * Gunakan sebagai children dari *FormDialog.
 */
export function FloatingFab() {
  return (
    <div
      className="md:hidden fixed right-4 z-[41]"
      style={{ bottom: 'max(calc(env(safe-area-inset-bottom) + 5rem), 5.5rem)' }}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-white/40 dark:bg-black/40 backdrop-blur-2xl border border-white/60 dark:border-white/15 shadow-lg shadow-black/15 active:scale-95 transition-transform">
        <Plus className="h-6 w-6 text-stone-800 dark:text-white" strokeWidth={2} />
      </div>
    </div>
  )
}
