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
        'fixed z-[45] flex items-center justify-center transition-all duration-200 ease-out',
        // z-45: di atas konten + bottom-nav (z-40) tapi DI BAWAH overlay dialog/drawer (z-50),
        // jadi otomatis tertutup saat menu/drawer lain terbuka. Plus fade mulus saat
        // dialog miliknya sendiri terbuka (FAB = trigger → dapat data-state="open").
        'data-[state=open]:opacity-0 data-[state=open]:scale-90 data-[state=open]:pointer-events-none',
        // posisi
        'right-5 md:right-8',
        'bottom-[max(calc(env(safe-area-inset-bottom)+4.75rem),5rem)] md:bottom-8',
        // bentuk: lingkaran iOS / desktop pill
        'h-14 w-14 rounded-full md:h-12 md:w-auto md:gap-2 md:px-5',
        // CTA utama — emerald solid (satu-satunya aksen hijau besar di layar)
        'bg-[var(--brand-solid)]',
        'shadow-[0_8px_24px_rgba(14,122,88,0.35)]',
        // teks
        'text-white',
        'text-sm font-semibold tracking-tight',
        // interaksi
        'hover:brightness-110 md:hover:translate-y-[-1px]',
        'active:scale-95 md:active:scale-[0.97]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
    >
      <Plus className="h-6 w-6 md:h-4 md:w-4" strokeWidth={2.5} />
      <span className="hidden md:inline">Tambah</span>
    </button>
  )
})
