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
        'rounded-xl border p-5 transition-all duration-200',
        'hover:shadow-sm hover:-translate-y-px',
        highlight
          ? 'bg-gradient-to-br from-orange-50 to-white border-orange-100 shadow-sm shadow-orange-100/50'
          : 'bg-white border-stone-200/80'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 leading-none">
          {title}
        </p>
        {icon && (
          <div
            className={cn(
              'flex items-center justify-center h-8 w-8 rounded-lg shrink-0',
              iconBg ?? 'bg-stone-100'
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <p
        className={cn(
          'font-bold tracking-tight num leading-none',
          highlight ? 'text-lg sm:text-2xl text-stone-900' : 'text-base sm:text-xl text-stone-800'
        )}
      >
        {value}
      </p>

      {subtitle && (
        <p className="text-xs text-stone-400 mt-2">{subtitle}</p>
      )}
    </div>
  )
}

export default MetricCard
