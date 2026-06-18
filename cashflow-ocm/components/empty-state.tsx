import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * EmptyState — placeholder konsisten untuk list yang kosong.
 * Premium minimalist, monokrom, tidak mencolok.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-black/[0.06] dark:border-white/[0.06]',
        'bg-stone-50/40 dark:bg-white/[0.02] py-14 px-6 text-center',
        className,
      )}
    >
      <div className="relative mb-4">
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl blur-xl bg-stone-300/30 dark:bg-white/5"
        />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-white/[0.04]">
          <Icon className="h-6 w-6 text-stone-400 dark:text-zinc-500" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-sm font-semibold text-stone-800 dark:text-zinc-200 tracking-tight">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-stone-500 dark:text-zinc-500 max-w-[28ch] leading-relaxed">{description}</p>
      )}
      {action && (
        <div className="mt-5 flex justify-center w-full">{action}</div>
      )}
    </div>
  )
}
