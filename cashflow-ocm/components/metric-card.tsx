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

export function MetricCard({ title, value, subtitle, icon, iconBg, borderColor, highlight }: Props) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md',
        borderColor
          ? `border border-stone-200 border-l-4 ${borderColor}`
          : 'border border-stone-200',
        highlight && 'ring-1 ring-orange-100'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2 leading-none">
          {title}
        </p>
        <p
          className={cn(
            'font-bold tracking-tight num text-stone-900',
            highlight ? 'text-3xl' : 'text-2xl'
          )}
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-stone-400 mt-1.5">{subtitle}</p>
        )}
      </div>

      {icon && (
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ml-4',
            iconBg ?? 'bg-stone-100'
          )}
        >
          {icon}
        </div>
      )}
    </div>
  )
}

export default MetricCard
