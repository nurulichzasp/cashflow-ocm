'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight, AlertTriangle, X } from 'lucide-react'
import { formatRentangKotak } from '@/lib/format'
import { cn } from '@/lib/utils'

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const HARI = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg']

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function parse(s: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) } : null
}

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
  // anchor = klik pertama dalam sesi pemilihan berjalan (untuk membentuk rentang)
  const [anchor, setAnchor] = useState<string | null>(null)
  // Portal hanya setelah mount (hindari mismatch SSR)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const init = parse(dari)
  const today = new Date()
  const [view, setView] = useState({ y: init?.y ?? today.getFullYear(), m: init?.m ?? today.getMonth() })

  // Saat dibuka: arahkan bulan tampilan ke "dari" & reset sesi pemilihan.
  useEffect(() => {
    if (open) {
      const p = parse(dari)
      if (p) setView({ y: p.y, m: p.m })
      setAnchor(null)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tutup saat Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function pick(dateStr: string) {
    if (anchor === null) {
      // Klik pertama → tanggal tunggal (dari = tanggal, sampai null). Tetap terbuka.
      setAnchor(dateStr)
      onChange(dateStr, '')
    } else {
      // Klik kedua → bentuk rentang (swap bila terbalik); sama persis → tetap tunggal.
      const from = anchor < dateStr ? anchor : dateStr
      const to = anchor < dateStr ? dateStr : anchor
      onChange(from, from === to ? '' : to)
      setAnchor(null)
      setOpen(false)
    }
  }

  // Grid bulan (mulai Senin)
  const firstDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7 // 0 = Senin
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const selFrom = dari
  const selTo = sampai || dari
  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate())

  function prevMonth() {
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))
  }
  function nextMonth() {
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))
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
          {/* Backdrop — overlay tengah layar agar kalender tak terpotong area scroll dialog.
              Dirender ke <body> via portal supaya `fixed` relatif ke viewport, bukan ke
              dialog (yang memakai transform → jadi containing block elemen fixed). */}
          <div className="fixed inset-0 z-[80] bg-black/50" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            className="fixed left-1/2 top-1/2 z-[90] -translate-x-1/2 -translate-y-1/2 w-[320px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={prevMonth} className="h-8 w-8 flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-white/[0.06]">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-stone-800 dark:text-zinc-100">{BULAN[view.m]} {view.y}</span>
              <button type="button" onClick={nextMonth} className="h-8 w-8 flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-white/[0.06]">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {HARI.map((h) => (
                <div key={h} className="h-7 flex items-center justify-center text-[11px] font-medium text-stone-400 dark:text-zinc-500">{h}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (d === null) return <div key={i} className="h-9" />
                const ds = ymd(view.y, view.m, d)
                const isFrom = ds === selFrom
                const isTo = ds === selTo
                const inRange = selFrom && selTo && ds > selFrom && ds < selTo
                const isAnchor = anchor === ds
                const isToday = ds === todayStr
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pick(ds)}
                    className={cn(
                      'h-9 flex items-center justify-center rounded-lg text-sm tabular-nums transition-colors',
                      (isFrom || isTo || isAnchor)
                        ? 'bg-emerald-600 text-white font-semibold'
                        : inRange
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-white/[0.06]',
                      isToday && !(isFrom || isTo || isAnchor) && 'ring-1 ring-inset ring-emerald-500/40',
                    )}
                  >
                    {d}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-stone-100 dark:border-zinc-800 pt-2.5">
              <span className="text-[11px] text-stone-400 dark:text-zinc-500">
                {anchor ? 'Pilih tanggal akhir…' : 'Klik 1 tanggal atau pilih rentang'}
              </span>
              <div className="flex items-center gap-3">
                {dari && (
                  <button
                    type="button"
                    onClick={() => { onChange('', ''); setAnchor(null); setOpen(false) }}
                    className="text-[11px] font-medium text-stone-400 hover:text-red-500"
                  >
                    Hapus
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                >
                  <X className="h-3 w-3" /> Tutup
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  )
}
