import React from 'react'
import { cn } from '@/lib/utils'

type Props = {
  title: string
  value: string
  subtitle?: string
  icon?: React.ReactNode
  iconBg?: string
  borderColor?: string
  highlight?: boolean
}

export function MetricCard({ title, value, subtitle, icon, iconBg, highlight }: Props) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        highlight
          ? 'bg-gradient-to-br from-orange-50 via-orange-50/50 to-white dark:from-orange-950/30 dark:via-orange-950/10 dark:to-transparent border-orange-200/60 dark:border-orange-900/40 shadow-sm shadow-orange-100/80 dark:shadow-orange-950/20'
          : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700'
      )}
    >
      <div className="flex items-start justify-between mb-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500 leading-none">
          {title}
        </p>
        {icon && (
          <div
            className={cn(
              'flex items-center justify-center h-8 w-8 rounded-lg shrink-0',
              iconBg ?? 'bg-stone-100 dark:bg-stone-800'
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <p
        className={cn(
          'font-bold tracking-tight num leading-none',
          highlight
            ? 'text-xl sm:text-2xl text-orange-700 dark:text-orange-400'
            : 'text-lg sm:text-xl text-stone-900 dark:text-stone-100'
        )}
      >
        {value}
      </p>

      {subtitle && (
        <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-2 leading-relaxed">{subtitle}</p>
      )}
    </div>
  )
}

export default MetricCard
