'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

const options = [
  { value: 'light',  label: 'Terang',    icon: Sun,     desc: 'Selalu terang' },
  { value: 'system', label: 'Otomatis',  icon: Monitor, desc: 'Ikuti HP' },
  { value: 'dark',   label: 'Gelap',     icon: Moon,    desc: 'Selalu gelap' },
]

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <div className="flex gap-3">
      {options.map(({ value, label, icon: Icon, desc }) => {
        const active = theme === value
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              'flex flex-1 flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-200',
              active
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-200 dark:hover:border-stone-700'
            )}
          >
            <Icon className={cn('h-5 w-5', active ? 'text-orange-500' : 'text-stone-400 dark:text-stone-500')} />
            <div className="text-center">
              <p className={cn('text-xs font-semibold', active ? 'text-orange-600 dark:text-orange-400' : 'text-stone-700 dark:text-stone-300')}>
                {label}
              </p>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">{desc}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* Compact 3-icon toggle — for sidebar & bottom nav */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <div className="flex items-center gap-0.5 p-1 rounded-lg bg-white/[0.05]">
      {([['light', Sun], ['system', Monitor], ['dark', Moon]] as const).map(([val, Icon]) => (
        <button
          key={val}
          onClick={() => setTheme(val)}
          className={cn(
            'flex items-center justify-center h-6 w-6 rounded-md transition-all duration-150',
            theme === val
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-stone-500 hover:text-stone-300'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}
