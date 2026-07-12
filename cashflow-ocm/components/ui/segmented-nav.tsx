import Link from 'next/link'
import { cn } from '@/lib/utils'

export type SegmentedNavItem = {
  /** Kunci unik segmen (dibandingkan dengan activeKey). */
  key: string
  label: string
  /** URL server-rendered (mis. `/peron?view=kesehatan`) agar shareable & data di-fetch on demand. */
  href: string
}

/**
 * SegmentedNav — pill segmented ala iOS berbasis <Link> (bukan client state).
 * Perpindahan segmen = navigasi server (replace history, tanpa scroll-reset)
 * sehingga tiap segmen di-render & di-fetch on demand di server.
 */
export function SegmentedNav({
  items,
  activeKey,
  ariaLabel,
  className,
}: {
  items: SegmentedNavItem[]
  activeKey: string
  ariaLabel: string
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex w-full items-center gap-1 rounded-xl bg-stone-100 p-1 dark:bg-white/[0.06]', className)}
    >
      {items.map((item) => {
        const active = item.key === activeKey
        return (
          <Link
            key={item.key}
            role="tab"
            aria-selected={active}
            href={item.href}
            replace
            scroll={false}
            className={cn(
              'flex h-10 min-w-0 flex-1 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors',
              active
                ? 'bg-white text-stone-900 shadow-sm dark:bg-white/[0.12] dark:text-zinc-50'
                : 'text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-200',
            )}
          >
            <span className="truncate">{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
