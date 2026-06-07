'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * FloatingFab — liquid-glass "+ Tambah" trigger, responsive.
 *
 * Mobile : square 56px, ikon saja, di atas bottom-nav + safe area.
 * Desktop: pill h-12, ikon + label "Tambah", pojok kanan bawah viewport
 *          (zona natural cursor/ibu jari saat scroll panjang).
 *
 * Satu element button (bukan fragment) supaya kompatibel dengan
 * Radix DialogTrigger asChild — meneruskan onClick + ref dengan benar.
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
        'fixed z-[60] flex items-center justify-center transition-all duration-200 ease-out',
        // posisi
        'right-5 md:right-8',
        'bottom-[max(calc(env(safe-area-inset-bottom)+4.75rem),5rem)] md:bottom-8',
        // bentuk: mobile square / desktop pill
        'h-14 w-14 rounded-2xl md:h-12 md:w-auto md:gap-2 md:px-5 md:rounded-full',
        // surface — mobile glass tipis, desktop solid premium
        'bg-white/[0.08] md:bg-stone-900/95 dark:md:bg-white/[0.95]',
        'backdrop-blur-2xl md:backdrop-blur-xl',
        'border border-white/[0.14] md:border-white/[0.08] dark:md:border-black/[0.08]',
        'shadow-[0_10px_30px_rgba(0,0,0,0.4)] md:shadow-[0_12px_36px_rgba(0,0,0,0.35)]',
        // teks
        'text-stone-900 dark:text-white md:text-white dark:md:text-stone-900',
        'text-sm font-semibold tracking-tight',
        // interaksi
        'hover:bg-white/[0.14] md:hover:translate-y-[-1px] md:hover:shadow-[0_16px_44px_rgba(0,0,0,0.4)]',
        'active:scale-95 md:active:scale-[0.97]',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 md:focus-visible:ring-2 md:focus-visible:ring-stone-400',
        className,
      )}
    >
      <Plus className="h-6 w-6 md:h-4 md:w-4" strokeWidth={2.5} />
      <span className="hidden md:inline">Tambah</span>
    </button>
  )
})
