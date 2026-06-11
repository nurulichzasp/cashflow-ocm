'use client'

import { Input } from '@/components/ui/input'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  /** Awal rentang "dari" (YYYY-MM-DD) atau '' */
  dari: string
  /** Akhir rentang "sampai" (YYYY-MM-DD) atau '' (= tanggal tunggal) */
  sampai: string
  /** Dipanggil dengan (dari, sampai). sampai = '' berarti tanggal tunggal. */
  onChange: (dari: string, sampai: string) => void
  /** Tampilkan badge amber bila rentang melewati >1 harga acuan */
  warning?: boolean
  className?: string
}

/**
 * Tanggal replas per baris memakai input date NATIVE (sama persis seperti field
 * Tanggal header) — picker bawaan OS, andal, langsung bisa diklik. Layout SATU BARIS
 * horizontal (dapat lebar penuh dari barisnya sendiri): "Dari" s/d "Sampai". Field
 * "Sampai" muncul begitu "Dari" terisi; kosongkan (×) untuk tanggal tunggal.
 */
export function DateRangePopover({ dari, sampai, onChange, warning, className }: Props) {
  function setDari(v: string) {
    // Bila "sampai" jadi lebih awal dari "dari" yang baru, kosongkan (tak valid).
    const s = v && sampai && sampai < v ? '' : sampai
    onChange(v, s)
  }
  function setSampai(v: string) {
    // Swap otomatis bila "sampai" lebih awal dari "dari".
    if (v && dari && v < dari) { onChange(v, dari); return }
    onChange(dari, v)
  }

  const showSampai = !!(dari || sampai)

  return (
    <div className={cn('flex items-center gap-1.5 min-w-0', className)}>
      <Input
        type="date"
        value={dari}
        onChange={(e) => setDari(e.target.value)}
        className="h-8 text-xs px-2 min-w-0 flex-1 text-stone-600 dark:text-zinc-300"
      />
      {showSampai && (
        <>
          <span className="text-[10px] font-medium text-stone-400 dark:text-zinc-500 shrink-0">s/d</span>
          <Input
            type="date"
            value={sampai}
            min={dari || undefined}
            onChange={(e) => setSampai(e.target.value)}
            className="h-8 text-xs px-2 min-w-0 flex-1 text-stone-600 dark:text-zinc-300"
          />
          {sampai && (
            <button
              type="button"
              onClick={() => onChange(dari, '')}
              aria-label="Hapus tanggal akhir"
              className="shrink-0 px-0.5 text-stone-400 hover:text-red-500 text-base leading-none"
            >
              ×
            </button>
          )}
        </>
      )}
      {warning && (
        <span title="Ada >1 harga di rentang ini — harga pakai tanggal awal. Pecah baris kalau perlu." className="shrink-0">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        </span>
      )}
    </div>
  )
}
