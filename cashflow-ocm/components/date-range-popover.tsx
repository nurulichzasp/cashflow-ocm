'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, AlertTriangle } from 'lucide-react'
import { formatRentangKotak } from '@/lib/format'
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
  placeholder?: string
  className?: string
}

export function DateRangePopover({ dari, sampai, onChange, warning, placeholder = 'Tgl replas', className }: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Tutup saat Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Atur "dari" — bila "sampai" jadi lebih awal, kosongkan (tak valid).
  function setDari(v: string) {
    const s = v && sampai && sampai < v ? '' : sampai
    onChange(v, s)
  }
  // Atur "sampai" — swap otomatis bila lebih awal dari "dari".
  function setSampai(v: string) {
    if (v && dari && v < dari) { onChange(v, dari); return }
    onChange(dari, v)
  }

  const label = formatRentangKotak(dari, sampai)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={warning ? 'Ada >1 harga di rentang ini — harga pakai tanggal awal. Pecah baris kalau perlu.' : undefined}
        className={cn(
          'h-8 w-full flex items-center gap-1.5 rounded-md border px-2 text-sm transition-colors min-w-0',
          'border-stone-200 dark:border-border bg-transparent',
          'hover:border-stone-300 dark:hover:border-zinc-600',
          open && 'ring-2 ring-emerald-500/40 border-emerald-500',
          className,
        )}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-stone-400" />
        <span className={cn('truncate', label ? 'text-stone-700 dark:text-zinc-200' : 'text-stone-400 dark:text-zinc-500')}>
          {label || placeholder}
        </span>
        {warning && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500 ml-auto" />}
      </button>

      {open && mounted && createPortal(
        <>
          {/* Backdrop + panel di-portal ke <body> agar tampil di tengah viewport.
              pointer-events-auto wajib: Radix Dialog mematikan pointer-events di luar
              kontennya, tanpa ini panel tidak bisa diklik. */}
          <div
            className="fixed inset-0 z-[80] bg-black/50 pointer-events-auto"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            className="fixed left-1/2 top-1/2 z-[90] -translate-x-1/2 -translate-y-1/2 w-[320px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-2xl pointer-events-auto"
          >
            <p className="text-sm font-semibold text-stone-800 dark:text-zinc-100 mb-3">Tanggal Replas</p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-500 dark:text-zinc-400">Dari</label>
                <input
                  type="date"
                  value={dari}
                  onChange={(e) => setDari(e.target.value)}
                  className="h-11 w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-transparent px-3 text-base text-stone-800 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-500 dark:text-zinc-400">Sampai <span className="text-stone-400 dark:text-zinc-500 font-normal">(opsional)</span></label>
                <input
                  type="date"
                  value={sampai}
                  min={dari || undefined}
                  onChange={(e) => setSampai(e.target.value)}
                  className="h-11 w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-transparent px-3 text-base text-stone-800 dark:text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            <p className="mt-2 text-[11px] text-stone-400 dark:text-zinc-500">
              Kosongkan “Sampai” untuk satu tanggal. Harga baris ikut tanggal “Dari”.
            </p>

            <div className="mt-4 flex items-center justify-between">
              {dari ? (
                <button
                  type="button"
                  onClick={() => { onChange('', ''); setOpen(false) }}
                  className="text-sm font-medium text-stone-400 hover:text-red-500"
                >
                  Hapus
                </button>
              ) : <span />}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Selesai
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  )
}
