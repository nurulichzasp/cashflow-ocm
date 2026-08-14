'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHydrated } from '@/hooks/use-hydrated'

const options = [
  { value: 'light',  label: 'Terang',    icon: Sun,     desc: 'Selalu terang' },
  { value: 'system', label: 'Otomatis',  icon: Monitor, desc: 'Ikuti HP' },
  { value: 'dark',   label: 'Gelap',     icon: Moon,    desc: 'Selalu gelap' },
]

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const hydrated = useHydrated()
  if (!hydrated) return null

  return (
    <div className="flex gap-3" role="radiogroup" aria-label="Pilih tema tampilan">
      {options.map(({ value, label, icon: Icon, desc }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} — ${desc}`}
            onClick={() => setTheme(value)}
            className={cn(
              'flex flex-1 flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-200',
              active
                ? 'border-stone-300 dark:border-white/[0.18] bg-stone-50 dark:bg-white/[0.06]'
                : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-200 dark:hover:border-stone-700'
            )}
          >
            <Icon className={cn('h-5 w-5', active ? 'text-stone-900 dark:text-white' : 'text-stone-400 dark:text-stone-500')} />
            <div className="text-center">
              <p className={cn('text-xs font-semibold', active ? 'text-stone-900 dark:text-white' : 'text-stone-700 dark:text-stone-300')}>
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
  const hydrated = useHydrated()
  if (!hydrated) return null

  return (
    <div className="flex items-center gap-0.5 p-1 rounded-lg bg-white/[0.05]" role="radiogroup" aria-label="Tema tampilan">
      {([['light', Sun, 'Terang'], ['system', Monitor, 'Otomatis'], ['dark', Moon, 'Gelap']] as const).map(([val, Icon, lbl]) => (
        <button
          key={val}
          type="button"
          role="radio"
          aria-checked={theme === val}
          aria-label={lbl}
          onClick={() => setTheme(val)}
          className={cn(
            'tap-pad flex items-center justify-center h-6 w-6 rounded-md transition-all duration-150',
            theme === val
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-300'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}
