'use client'

import { useState, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangeInline } from '@/components/date-range-inline'
import { CalendarDays, X } from 'lucide-react'

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function getMonthRange(year: number, month: number) {
  const dari = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const sampai = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { dari, sampai }
}

interface Props {
  dari: string
  sampai: string
  onChange: (dari: string, sampai: string) => void
}

export function DateRangeFilter({ dari, sampai, onChange }: Props) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [mode, setMode] = useState<'bulan' | 'rentang'>('bulan')

  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let y = currentYear; y >= currentYear - 3; y--) years.push(y)
    return years
  }, [currentYear])

  function handleMonthSelect(monthYear: string) {
    if (monthYear === 'semua') {
      onChange('', '')
      return
    }
    const [y, m] = monthYear.split('-').map(Number)
    const { dari, sampai } = getMonthRange(y, m)
    onChange(dari, sampai)
  }

  function handleClear() {
    onChange('', '')
  }

  const selectedMonthValue = useMemo(() => {
    if (!dari) return 'semua'
    const d = new Date(dari)
    return `${d.getFullYear()}-${d.getMonth() + 1}`
  }, [dari])

  return (
    <div className="flex flex-col gap-1 w-full sm:w-auto min-w-0">
      {mode === 'bulan' ? (
        <Select value={selectedMonthValue} onValueChange={handleMonthSelect}>
          <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-stone-400" />
            <SelectValue placeholder="Pilih bulan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua</SelectItem>
            {yearOptions.map(year =>
              Array.from({ length: year === currentYear ? currentMonth : 12 }, (_, i) => {
                const m = year === currentYear ? currentMonth - i : 12 - i
                return (
                  <SelectItem key={`${year}-${m}`} value={`${year}-${m}`}>
                    {MONTHS[m - 1]} {year}
                  </SelectItem>
                )
              })
            )}
          </SelectContent>
        </Select>
      ) : (
        <DateRangeInline dari={dari} sampai={sampai} onChange={onChange} className="w-full sm:w-auto" />
      )}

      {/* Aksi sekunder: ganti mode + reset (tidak mengganggu lebar dropdown) */}
      <div className="flex items-center gap-3 px-0.5">
        <button
          type="button"
          onClick={() => setMode(mode === 'bulan' ? 'rentang' : 'bulan')}
          className="text-[11px] font-medium text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
        >
          {mode === 'bulan' ? 'Pakai rentang tanggal' : 'Pilih per bulan'}
        </button>
        {dari && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-stone-400 hover:text-red-500 transition-colors"
          >
            <X className="h-3 w-3" /> Reset
          </button>
        )}
      </div>
    </div>
  )
}
