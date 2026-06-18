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
import { formatTanggal, formatRupiah, todayString, formatCompact, formatRentangFilter } from '@/lib/format'
import { shareNota } from '@/lib/share'
import { Trash2, FileText, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Share2 } from 'lucide-react'
import { DateRangeFilter } from '@/components/date-range-filter'
import { EmptyState } from '@/components/empty-state'
import { RowActionMenu, type RowAction } from '@/components/ui/row-action-menu'
import type { Penjualan } from '@/lib/db/schema'

interface Props {
  penjualanList: Penjualan[]
  isOwner: boolean
  /** Margin (estimasi laba) = Σ markup peron all-time (lintas modul, bukan per-rentang). */
  estimasiLaba: number
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

export function PenjualanTable({ penjualanList, isOwner, estimasiLaba }: Props) {
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

  const isFiltered = !!dari || !!sampai
  const rangeLabel = formatRentangFilter(dari, sampai)
  const totalPenjualan = filtered.reduce((s, p) => s + (p.totalBersih ?? 0), 0)
  const totalPpn = filtered.reduce((s, p) => {
    const bersih = p.totalBersih ?? 0
    const nilai = p.totalNilai ?? 0
    return s + (nilai > bersih ? nilai - bersih : 0)
  }, 0)

  return (
    <div className="space-y-3">
      {/* Hero — IKUT filter (pola Pembelian). Total/Transaksi/PPN dari rentang;
          Margin = estimasi laba all-time (lintas modul, tak ber-rentang). */}
      <div className="surface px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">Total Penjualan</p>
            <p className="mt-1.5 text-[2.25rem] sm:text-[2.75rem] font-bold num tabular-nums tracking-[-0.03em] leading-none text-stone-900 dark:text-zinc-50">
              {formatCompact(totalPenjualan)}
            </p>
            <p className="mt-1.5 text-[11px] text-stone-400 dark:text-zinc-500">
              {isFiltered ? `Nilai bersih · ${rangeLabel}` : 'Nilai bersih · seluruh transaksi'}
            </p>
          </div>
          <div className="flex items-center gap-5 sm:gap-6 shrink-0">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">Transaksi</p>
              <p className="mt-1 text-sm font-semibold num tabular-nums text-stone-700 dark:text-zinc-300">{filtered.length.toLocaleString('id-ID')}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">PPN</p>
              <p className="mt-1 text-sm font-semibold num tabular-nums text-stone-700 dark:text-zinc-300">{formatCompact(totalPpn)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">Margin</p>
              <p className="mt-1 text-sm font-semibold num tabular-nums text-stone-700 dark:text-zinc-300">{formatCompact(estimasiLaba)}</p>
            </div>
          </div>
        </div>
      </div>

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
  const [editOpen, setEditOpen] = useState(false)
  const invoices = (item.noInvoice ?? '').split('\n').filter(Boolean)
  const primaryInvoice = invoices[0] || 'Tanpa nomor invoice'
  const moreInvoices = invoices.length > 1 ? invoices.length - 1 : 0

  const catatan = item.catatan ?? ''

  async function handleShare() {
    const lines = [
      `Penjualan ${formatTanggal(item.tanggal)}`,
      invoices.length ? `Invoice:\n${invoices.join('\n')}` : '',
      item.totalBersih ? `Nilai Bersih: ${formatRupiah(item.totalBersih)}` : '',
      item.totalNilai ? `Total Dibayar: ${formatRupiah(item.totalNilai)}` : '',
      item.tanggalBayarBga ? `Tgl Bayar: ${formatTanggal(item.tanggalBayarBga)}` : '',
      catatan ? `\nCatatan:\n${catatan}` : '',
    ].filter(Boolean).join('\n')
    // Web Share API → share sheet native iOS; fallback ke clipboard / WA.
    const res = await shareNota({ title: `Penjualan ${formatTanggal(item.tanggal)} — CV OCM`, text: lines })
    if (res === 'copied') toast.success('Nota disalin ke clipboard')
  }

  const actions: RowAction[] = [
    { key: 'share', label: 'Bagikan nota', icon: Share2, onSelect: handleShare },
    { key: 'edit', label: 'Edit', icon: Pencil, separated: true, onSelect: () => setEditOpen(true) },
    ...(isOwner
      ? [{
          key: 'delete',
          label: 'Hapus',
          icon: Trash2,
          destructive: true,
          separated: true,
          onSelect: () => onDelete(item.id),
          confirm: {
            title: 'Hapus penjualan?',
            description: `Invoice ${primaryInvoice} akan dihapus.`,
            confirmLabel: 'Hapus',
            busyLabel: 'Menghapus…',
            busy: deletingId === item.id,
          },
        } as RowAction]
      : []),
  ]

  return (
    <div className="surface p-4">
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
        <div className="flex shrink-0 items-center gap-1">
          <StatusDot
            status={item.statusBayar}
            onToggle={item.statusBayar === 'belum' ? () => onToggleLunas(item.id) : undefined}
            loading={updatingId === item.id}
          />
          <RowActionMenu
            variant="sheet"
            title={primaryInvoice}
            subtitle={formatTanggal(item.tanggal)}
            actions={actions}
            triggerLabel="Aksi penjualan"
          />
        </div>
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

      {editOpen && (
        <PenjualanFormDialog editItem={item} open={editOpen} onOpenChange={setEditOpen} />
      )}
    </div>
  )
}
