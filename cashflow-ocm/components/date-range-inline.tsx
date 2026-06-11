'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTanggal } from '@/lib/format'

/**
 * Satu kotak tanggal: menampilkan LABEL internal saat kosong ("Dari"/"s/d"),
 * dan tanggal terformat saat terisi. Input date NATIVE di-overlay transparan di
 * atasnya → ketuk = buka picker bawaan OS (andal, tanpa kalender custom).
 */
function DateBox({
  value,
  label,
  min,
  onChange,
}: {
  value: string
  label: string
  min?: string
  onChange: (v: string) => void
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <div
        className={cn(
          'flex h-9 items-center rounded-lg border border-stone-300 bg-transparent px-3 text-xs dark:border-stone-600',
          value ? 'text-stone-700 dark:text-zinc-200' : 'text-stone-400 dark:text-zinc-500',
        )}
      >
        <span className="truncate">{value ? formatTanggal(value) : label}</span>
      </div>
      <input
        type="date"
        value={value}
        min={min}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  )
}

/**
 * Rentang tanggal SATU BARIS: [Dari] [s/d] dengan label di dalam kotak (hilang
 * saat terisi), plus tombol × kecil untuk reset. Dipakai konsisten di semua
 * filter & laporan yang butuh pasangan tanggal dari–sampai.
 */
export function DateRangeInline({
  dari,
  sampai,
  onChange,
  className,
}: {
  dari: string
  sampai: string
  onChange: (dari: string, sampai: string) => void
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1.5 min-w-0', className)}>
      <DateBox
        value={dari}
        label="Dari"
        onChange={(v) => onChange(v, sampai && sampai < v ? '' : sampai)}
      />
      <DateBox
        value={sampai}
        label="s/d"
        min={dari || undefined}
        onChange={(v) => onChange(dari, v)}
      />
      {(dari || sampai) && (
        <button
          type="button"
          onClick={() => onChange('', '')}
          aria-label="Hapus rentang tanggal"
          className="shrink-0 rounded-md p-1 text-stone-400 transition-colors hover:text-red-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
