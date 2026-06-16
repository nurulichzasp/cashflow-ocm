'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PaymentStatusDot } from '@/components/ui/status-pill'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deletePenjualan, updatePenjualanStatus } from './actions'
import { PenjualanFormDialog } from './penjualan-form-dialog'
import { formatTanggal, formatRupiah, todayString } from '@/lib/format'
import { Trash2, FileText, ArrowUpDown, ArrowUp, ArrowDown, Pencil } from 'lucide-react'
import { DateRangeFilter } from '@/components/date-range-filter'
import { EmptyState } from '@/components/empty-state'
import type { Penjualan } from '@/lib/db/schema'

interface Props {
  penjualanList: Penjualan[]
  isOwner: boolean
}

/** Status pembayaran — dot kecil + teks netral (Lunas=emerald, Belum=amber). */
export function StatusDot({ status, onToggle, loading }: { status: 'lunas' | 'belum'; onToggle?: () => void; loading?: boolean }) {
  const isLunas = status === 'lunas'
  const dot = <PaymentStatusDot status={status} loading={loading} />

  if (onToggle && !isLunas) {
    return (
      <button
        onClick={onToggle}
        disabled={loading}
        title="Klik untuk tandai Lunas"
        className="inline-flex transition-opacity hover:opacity-70 disabled:opacity-50 cursor-pointer"
      >
        {dot}
      </button>
    )
  }
  return dot
}

const StatusBadge = StatusDot

type SortCol = 'tanggal' | 'totalBersih' | 'totalNilai'

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-30" />
  return dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
}

export function PenjualanTable({ penjualanList, isOwner }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [sortBy, setSortBy] = useState<SortCol>('tanggal')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(col: SortCol) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let list = [...penjualanList]
    if (dari) list = list.filter(p => p.tanggal >= dari)
    if (sampai) list = list.filter(p => p.tanggal <= sampai)

    list.sort((a, b) => {
      let va: number, vb: number
      if (sortBy === 'tanggal') { va = a.tanggal.localeCompare(b.tanggal); return sortDir === 'asc' ? va : -va }
      if (sortBy === 'totalBersih') { va = a.totalBersih ?? 0; vb = b.totalBersih ?? 0 }
      else { va = a.totalNilai ?? 0; vb = b.totalNilai ?? 0 }
      return sortDir === 'asc' ? va - vb : vb - va
    })
    return list
  }, [penjualanList, dari, sampai, sortBy, sortDir])

  async function handleToggleLunas(id: string) {
    setUpdatingId(id)
    try {
      await updatePenjualanStatus(id, 'lunas', todayString())
      toast.success('Status diperbarui → Lunas')
    } catch {
      toast.error('Gagal memperbarui status')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deletePenjualan(id)
      toast.success('Penjualan berhasil dihapus')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus penjualan')
    } finally {
      setDeletingId(null)
    }
  }

  if (penjualanList.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Belum ada penjualan"
        description="Tambahkan transaksi pertama untuk mulai memantau piutang dan invoice."
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Filter tanggal/bulan */}
      <DateRangeFilter dari={dari} sampai={sampai} onChange={(d, s) => { setDari(d); setSampai(s) }} />
      {/* Desktop */}
      <div className="hidden md:block surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 dark:bg-white/[0.03] border-b border-stone-200 dark:border-border">
              <th scope="col" aria-sort={sortBy === 'tanggal' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <button type="button" onClick={() => handleSort('tanggal')} className="inline-flex items-center gap-1 select-none hover:text-stone-700 dark:hover:text-zinc-300">Tanggal <SortIcon active={sortBy === 'tanggal'} dir={sortDir} /></button>
              </th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">No. Invoice</th>
              <th scope="col" aria-sort={sortBy === 'totalBersih' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <button type="button" onClick={() => handleSort('totalBersih')} className="inline-flex items-center gap-1 justify-end w-full hover:text-stone-700 dark:hover:text-zinc-300">Nilai Bersih <SortIcon active={sortBy === 'totalBersih'} dir={sortDir} /></button>
              </th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Status</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Tgl Bayar</th>
              <th scope="col" className="px-4 py-3 w-10"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map((item) => (
              <PenjualanRow
                key={item.id}
                item={item}
                isOwner={isOwner}
                updatingId={updatingId}
                deletingId={deletingId}
                onToggleLunas={handleToggleLunas}
                onDelete={handleDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((item) => (
          <PenjualanCard
            key={item.id}
            item={item}
            isOwner={isOwner}
            updatingId={updatingId}
            deletingId={deletingId}
            onToggleLunas={handleToggleLunas}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}

interface RowProps {
  item: Penjualan
  isOwner: boolean
  updatingId: string | null
  deletingId: string | null
  onToggleLunas: (id: string) => void
  onDelete: (id: string) => void
}

/* ─── Desktop row — invoice diciutkan (primary + "+N lagi") ─── */
function PenjualanRow({ item, isOwner, updatingId, deletingId, onToggleLunas, onDelete }: RowProps) {
  const [expanded, setExpanded] = useState(false)
  const invoices = (item.noInvoice ?? '').split('\n').filter(Boolean)

  return (
    <tr className="bg-white hover:bg-stone-50 dark:hover:bg-white/[0.03] transition-colors align-top">
      <td className="px-4 py-3 text-stone-900 whitespace-nowrap">{formatTanggal(item.tanggal)}</td>
      <td className="px-4 py-3 font-medium text-stone-900 max-w-[240px]">
        {invoices.length === 0 ? (
          <span className="text-stone-400">—</span>
        ) : (
          <div className="leading-tight">
            <p className="font-mono text-[12px] truncate">{invoices[0]}</p>
            {invoices.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setExpanded(v => !v)}
                  className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:text-zinc-300 hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-colors"
                >
                  {expanded ? 'Sembunyikan' : `+${invoices.length - 1} invoice`} {expanded ? '↑' : '↓'}
                </button>
                {expanded && (
                  <div className="mt-1 space-y-0.5 font-mono text-[11px] text-stone-500 dark:text-zinc-400">
                    {invoices.slice(1).map((inv, i) => <p key={i} className="truncate">{inv}</p>)}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {item.totalBersih ? (
          <div>
            <p className="font-semibold num text-stone-900 dark:text-stone-100">{formatRupiah(item.totalBersih)}</p>
            {item.totalNilai && item.totalNilai !== item.totalBersih && (
              <p className="text-[11px] text-stone-400 num">Dibayar: {formatRupiah(item.totalNilai)}</p>
            )}
          </div>
        ) : item.totalNilai ? (
          <span className="font-semibold num text-stone-900 dark:text-stone-100">{formatRupiah(item.totalNilai)}</span>
        ) : <span className="text-stone-400">—</span>}
      </td>
      <td className="px-4 py-3">
        <StatusBadge
          status={item.statusBayar}
          onToggle={item.statusBayar === 'belum' ? () => onToggleLunas(item.id) : undefined}
          loading={updatingId === item.id}
        />
      </td>
      <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{item.tanggalBayarBga ? formatTanggal(item.tanggalBayarBga) : <span className="text-stone-400">—</span>}</td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-0.5">
          <PenjualanFormDialog editItem={item}>
            <Button variant="ghost" size="icon" aria-label="Edit" className="tap-pad h-8 w-8 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200">
              <Pencil className="h-4 w-4" />
            </Button>
          </PenjualanFormDialog>
          {isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Hapus" className="tap-pad h-8 w-8 text-stone-400 hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus penjualan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Invoice <strong>{invoices[0] || 'tanpa nomor'}</strong> akan dihapus secara permanen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => onDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? 'Menghapus...' : 'Hapus'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </td>
    </tr>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Premium mobile card — collapsible invoice list, catatan clamped
   ───────────────────────────────────────────────────────────────── */

function PenjualanCard({ item, isOwner, updatingId, deletingId, onToggleLunas, onDelete }: RowProps) {
  const [expanded, setExpanded] = useState(false)
  const invoices = (item.noInvoice ?? '').split('\n').filter(Boolean)
  const primaryInvoice = invoices[0] || 'Tanpa nomor invoice'
  const moreInvoices = invoices.length > 1 ? invoices.length - 1 : 0

  const catatan = item.catatan ?? ''

  function handleShare() {
    const lines = [
      `Penjualan ${formatTanggal(item.tanggal)}`,
      invoices.length ? `Invoice:\n${invoices.join('\n')}` : '',
      item.totalBersih ? `Nilai Bersih: ${formatRupiah(item.totalBersih)}` : '',
      item.totalNilai ? `Total Dibayar: ${formatRupiah(item.totalNilai)}` : '',
      item.tanggalBayarBga ? `Tgl Bayar: ${formatTanggal(item.tanggalBayarBga)}` : '',
      catatan ? `\nCatatan:\n${catatan}` : '',
    ].filter(Boolean).join('\n')
    const text = encodeURIComponent(lines)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-white/[0.025] p-4">
      {/* Header: invoice + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] text-stone-900 dark:text-zinc-100 leading-snug truncate">
            {primaryInvoice}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-stone-500 dark:text-zinc-500">
            <span>{formatTanggal(item.tanggal)}</span>
            {moreInvoices > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:text-zinc-300 hover:bg-black/[0.07] dark:hover:bg-white/[0.1] transition-colors"
              >
                +{moreInvoices} {expanded ? '↑' : '↓'}
              </button>
            )}
          </div>
        </div>
        <StatusDot
          status={item.statusBayar}
          onToggle={item.statusBayar === 'belum' ? () => onToggleLunas(item.id) : undefined}
          loading={updatingId === item.id}
        />
      </div>

      {/* Expanded extra invoices */}
      {expanded && moreInvoices > 0 && (
        <div className="mt-2 pl-0.5 text-[12px] font-mono text-stone-600 dark:text-zinc-400 space-y-0.5">
          {invoices.slice(1).map((inv, i) => (
            <p key={i} className="truncate">{inv}</p>
          ))}
        </div>
      )}

      {/* Nominal — hero */}
      {(item.totalBersih || item.totalNilai) ? (
        <div className="mt-3">
          {item.totalBersih && item.totalBersih > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-zinc-500 font-medium">Nilai Bersih</p>
              <p className="mt-1 text-[22px] font-bold text-stone-900 dark:text-zinc-50 num tabular-nums tracking-tight leading-none">
                {formatRupiah(item.totalBersih)}
              </p>
            </>
          )}
          {item.totalNilai && item.totalNilai > 0 && item.totalNilai !== item.totalBersih && (
            <p className="mt-1.5 text-[11px] text-stone-400 dark:text-zinc-500 num">
              Total dibayar {formatRupiah(item.totalNilai)}
            </p>
          )}
        </div>
      ) : null}

      {/* Meta row */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-stone-500 dark:text-zinc-500">
        {item.tanggalBayarBga && (
          <span className="inline-flex items-center gap-1">
            <span className="text-stone-400 dark:text-zinc-600">Bayar</span>
            <span className="text-stone-700 dark:text-zinc-300">{formatTanggal(item.tanggalBayarBga)}</span>
          </span>
        )}
        {catatan && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:text-zinc-300 hover:bg-black/[0.07] dark:hover:bg-white/[0.1] transition-colors"
          >
            <FileText className="h-2.5 w-2.5" /> Catatan {expanded ? '↑' : '↓'}
          </button>
        )}
      </div>

      {/* Catatan — disembunyikan, tampil hanya saat diperluas */}
      {catatan && expanded && (
        <div className="mt-3 pt-3 border-t border-black/[0.05] dark:border-white/[0.05]">
          <p className="text-[11px] uppercase tracking-widest text-stone-400 dark:text-zinc-500 font-medium mb-1">Catatan</p>
          <p className="text-[12px] text-stone-600 dark:text-zinc-400 whitespace-pre-line leading-relaxed">
            {catatan}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 pt-3 border-t border-black/[0.05] dark:border-white/[0.05] flex items-center gap-1">
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 min-h-[44px] text-[12px] font-medium text-stone-600 dark:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
          aria-label="Bagikan via WhatsApp"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.94 11.94 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.84a11.79 11.79 0 0 0 1.66 6.04L0 24l6.27-1.65a11.86 11.86 0 0 0 5.77 1.47h.01c6.54 0 11.84-5.3 11.84-11.84 0-3.16-1.23-6.13-3.37-8.5ZM12.04 21.8h-.01a9.94 9.94 0 0 1-5.06-1.38l-.36-.22-3.72.98.99-3.63-.23-.37a9.94 9.94 0 1 1 8.39 4.62Zm5.45-7.45c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.66.15-.2.3-.76.97-.93 1.17-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.39-1.47a8.97 8.97 0 0 1-1.66-2.06c-.17-.3-.02-.46.13-.6.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.6-.9-2.18-.24-.58-.49-.5-.66-.51l-.56-.01a1.1 1.1 0 0 0-.78.37c-.27.3-1.02 1-1.02 2.43 0 1.43 1.05 2.82 1.2 3.02.15.2 2.07 3.16 5.01 4.43.7.3 1.25.48 1.67.62.7.22 1.34.19 1.85.12.56-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"/></svg>
          Bagikan
        </button>
        <PenjualanFormDialog editItem={item}>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 min-h-[44px] text-[12px] font-medium text-stone-600 dark:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </PenjualanFormDialog>
        {isOwner && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 min-h-[44px] text-[12px] font-medium text-stone-500 dark:text-zinc-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus penjualan?</AlertDialogTitle>
                <AlertDialogDescription>
                  Invoice {primaryInvoice} akan dihapus.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => onDelete(item.id)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? 'Menghapus...' : 'Hapus'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
