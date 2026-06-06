'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-stone-400">
        <CalendarDays className="h-3.5 w-3.5" />
      </div>

      {mode === 'bulan' ? (
        <>
          <Select value={selectedMonthValue} onValueChange={handleMonthSelect}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
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
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-stone-400 hover:text-stone-600"
            onClick={() => setMode('rentang')}
          >
            Rentang
          </Button>
        </>
      ) : (
        <>
          <Input
            type="date"
            value={dari}
            onChange={(e) => onChange(e.target.value, sampai)}
            className="w-[140px] h-8 text-xs"
          />
          <span className="text-xs text-stone-400">s/d</span>
          <Input
            type="date"
            value={sampai}
            onChange={(e) => onChange(dari, e.target.value)}
            className="w-[140px] h-8 text-xs"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-stone-400 hover:text-stone-600"
            onClick={() => setMode('bulan')}
          >
            Bulan
          </Button>
        </>
      )}

      {dari && (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClear}>
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
