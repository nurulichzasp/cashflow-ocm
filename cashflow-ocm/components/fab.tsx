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
        // surface — iris solid premium (aksen brand, satu titik fokus aksi)
        'bg-[var(--brand-solid)]',
        'backdrop-blur-xl',
        'border border-white/[0.16]',
        'shadow-[0_10px_30px_rgba(80,72,212,0.40)] md:shadow-[0_14px_40px_rgba(80,72,212,0.45)]',
        // teks
        'text-white',
        'text-sm font-semibold tracking-tight',
        // interaksi
        'hover:brightness-110 md:hover:translate-y-[-1px] md:hover:shadow-[0_18px_48px_rgba(80,72,212,0.5)]',
        'active:scale-95 md:active:scale-[0.97]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
    >
      <Plus className="h-6 w-6 md:h-4 md:w-4" strokeWidth={2.5} />
      <span className="hidden md:inline">Tambah</span>
    </button>
  )
})
