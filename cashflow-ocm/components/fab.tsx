'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * FloatingFab — trigger liquid-glass untuk dialog form tambah.
 * Posisi: fixed bottom-right (di atas bottom-nav floating + safe area).
 * Wajib button element supaya Radix DialogTrigger asChild meneruskan onClick.
 */
export const FloatingFab = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function FloatingFab({ className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Tambah"
      {...props}
      className={cn(
        // posisi: di atas bottom-nav (~3.5rem) + safe-area + jarak nyaman
        'md:hidden fixed right-5 z-[60]',
        'flex h-14 w-14 items-center justify-center rounded-2xl',
        // premium glass — high blur, monokrom
        'bg-white/[0.08] dark:bg-white/[0.08] backdrop-blur-2xl',
        'border border-white/[0.12] dark:border-white/[0.12]',
        'shadow-[0_8px_28px_rgba(0,0,0,0.35)]',
        'text-stone-900 dark:text-white',
        'transition-all duration-200 ease-out',
        'hover:bg-white/[0.14] active:scale-95',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30',
        className,
      )}
      style={{ bottom: 'max(calc(env(safe-area-inset-bottom) + 5rem), 5.25rem)' }}
    >
      <Plus className="h-6 w-6" strokeWidth={2.25} />
    </button>
  )
})
