'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatTanggal, formatRupiah, formatCompact } from '@/lib/format'
import { deletePembelian } from './actions'
import { PembelianFormDialog } from './pembelian-form-dialog'
import { PrintRekapButton, PrintNotaButton } from './invoice-print'
import { EmptyState } from '@/components/empty-state'
import { FotoBuktiGallery } from '@/components/foto-bukti-gallery'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DateRangeFilter } from '@/components/date-range-filter'
import { Edit3, Trash2, ShoppingCart, ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, MoreVertical } from 'lucide-react'
import type { Pembelian, Peron, AkunKas, PembelianFoto, PembelianDetail } from '@/lib/db/schema'

type PembelianRow = Pembelian & { peron: Peron | null; sumberBayar: AkunKas | null; fotos: PembelianFoto[]; details: PembelianDetail[] }

interface Props {
  pembelianList: PembelianRow[]
  isOwner: boolean
  peronOptions: Array<{ id: string; nama: string; keuntunganPerKg: number }>
  akunOptions: Array<{ id: string; nama: string; tipe: string }>
}

// kategori warna teks saja — tanpa badge/kotak
const kategoriColor: Record<string, string> = {
  'OCM R1':    'text-stone-700 dark:text-zinc-300',
  'OCM R2':    'text-stone-700 dark:text-zinc-300',
  'OCMP SAGU': 'text-stone-700 dark:text-zinc-300',
  'OCM BRDL':  'text-stone-700 dark:text-zinc-300',
  'OCM BRDL KTWM': 'text-stone-700 dark:text-zinc-300',
  'OCM BRDL TRYM': 'text-stone-700 dark:text-zinc-300',
  'OCM BRDL LMDM': 'text-stone-700 dark:text-zinc-300',
}

function StatusBayar({ status }: { status: 'lunas' | 'belum' }) {
  const isLunas = status === 'lunas'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isLunas ? 'bg-foreground' : 'bg-transparent border border-muted-foreground'}`} />
      <span className="text-[11px] font-medium text-muted-foreground">
        {isLunas ? 'Lunas' : 'Belum'}
      </span>
    </span>
  )
}

function FotoIndicator({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-stone-400 font-medium">
      <ImageIcon className="h-3 w-3" />
      {count}
    </span>
  )
}

function PembelianRowMenu({ onEdit, onDelete, deleting, id }: { onEdit: () => void; onDelete: (id: string) => void; deleting: string | null; id: string }) {
  const [delOpen, setDelOpen] = useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="tap-pad inline-flex h-7 w-7 items-center justify-center rounded-md text-stone-400 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition-colors outline-none aria-expanded:bg-stone-100 dark:aria-expanded:bg-white/[0.06]"
          aria-label="Aksi"
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[150px]">
          <DropdownMenuItem onClick={onEdit}>
            <Edit3 className="h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDelOpen(true)}>
            <Trash2 className="h-4 w-4" /> Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus tiket pembelian?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => onDelete(id)}
              disabled={deleting === id}
            >
              {deleting === id ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function PembelianTable({ pembelianList, isOwner, peronOptions, akunOptions }: Props) {
  const [editTarget, setEditTarget] = useState<PembelianRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filterDari, setFilterDari] = useState('')
  const [filterSampai, setFilterSampai] = useState('')
  const [filterPeronId, setFilterPeronId] = useState('all')
  const [expandedFotoId, setExpandedFotoId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'tanggal' | 'peron' | 'tonase' | 'totalBeli' | 'keuntungan'>('tanggal')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = useCallback((col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }, [sortBy])

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deletePembelian(id)
      toast.success('Tiket berhasil dihapus')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus tiket')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = useMemo(() => {
    const list = pembelianList.filter((p) => {
      if (filterDari && p.tanggal < filterDari) return false
      if (filterSampai && p.tanggal > filterSampai) return false
      if (filterPeronId !== 'all' && p.peronId !== filterPeronId) return false
      return true
    })
    return [...list].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'tanggal') cmp = a.tanggal.localeCompare(b.tanggal)
      else if (sortBy === 'peron') cmp = (a.peron?.nama ?? '').localeCompare(b.peron?.nama ?? '')
      else if (sortBy === 'tonase') cmp = a.tonase - b.tonase
      else if (sortBy === 'totalBeli') cmp = a.totalBeli - b.totalBeli
      else if (sortBy === 'keuntungan') cmp = a.keuntungan - b.keuntungan
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [pembelianList, filterDari, filterSampai, filterPeronId, sortBy, sortDir])

  const nomorUrutMap = useMemo(() => {
    const map = new Map<string, number>()
    const groups: Record<string, PembelianRow[]> = {}
    for (const p of pembelianList) {
      const bulan = p.tanggal.slice(0, 7)
      const key = `${p.peronId}|${bulan}`
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    }
    for (const rows of Object.values(groups)) {
      rows.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.id.localeCompare(b.id))
      rows.forEach((p, i) => map.set(p.id, i + 1))
    }
    return map
  }, [pembelianList])

  const totalTonase = filtered.reduce((s, p) => s + p.tonase, 0)
  const totalBeli = filtered.reduce((s, p) => s + p.totalBeli, 0)
  const totalJual = filtered.reduce((s, p) => s + p.totalJual, 0)
  const totalUntung = filtered.reduce((s, p) => s + p.keuntungan, 0)
  const jumlahBelum = filtered.filter((p) => p.statusBayarPeron === 'belum').length
  const isFiltered = !!filterDari || !!filterSampai || filterPeronId !== 'all'

  if (pembelianList.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Belum ada pembelian"
        description="Tambahkan tiket timbang dari peron untuk mulai mencatat transaksi."
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Edit dialog (tersembunyi, dipicu dari row) */}
      <PembelianFormDialog
        peronOptions={peronOptions}
        akunOptions={akunOptions}
        open={!!editTarget}
        initialData={editTarget ? {
          id: editTarget.id,
          tanggal: editTarget.tanggal,
          kategori: editTarget.kategori as import('./actions').KategoriPembelian,
          peronId: editTarget.peronId,
          statusBayarPeron: editTarget.statusBayarPeron,
          sumberBayarId: editTarget.sumberBayarId ?? undefined,
          catatan: editTarget.catatan ?? undefined,
          keterangan: editTarget.keterangan ?? undefined,
          fotoUrls: editTarget.fotos.map((f) => f.url),
          details: editTarget.details.length > 0
            ? editTarget.details.map((d) => ({ noTid: d.noTid ?? undefined, tonase: d.tonase, hargaLapangan: d.hargaLapangan, tanggalReplas: d.tanggalReplas ?? undefined, tanggalReplasSampai: d.tanggalReplasSampai ?? undefined, jumlahReplas: d.jumlahReplas ?? undefined }))
            : [{ tonase: editTarget.tonase, hargaLapangan: editTarget.hargaBeli }],
        } : undefined}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
      >
        <Button variant="outline" size="sm" className="hidden" />
      </PembelianFormDialog>

      {/* Ringkasan — SATU hero, IKUT filter (tanggal/peron). Total Beli = modal ke peron.
          (Sebelumnya dobel: hero di page + 4 kartu di sini — kini disatukan.) */}
      <div className="surface px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-[#6B7280]">Total Beli</p>
            <p className="mt-1.5 text-[2.25rem] sm:text-[2.75rem] font-bold num tabular-nums tracking-[-0.03em] leading-none text-stone-900 dark:text-zinc-50">
              {formatCompact(totalBeli)}
            </p>
            <p className="mt-1.5 text-[11px] text-stone-400 dark:text-zinc-500">
              {isFiltered ? `Dibayar ke peron · ${filtered.length} tiket terfilter` : 'Dibayar ke peron · seluruh tiket'}
            </p>
          </div>
          <div className="flex items-center gap-5 sm:gap-6 shrink-0">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">Tiket</p>
              <p className="mt-1 text-sm font-semibold num tabular-nums text-stone-700 dark:text-zinc-300">{filtered.length.toLocaleString('id-ID')}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">Tonase</p>
              <p className="mt-1 text-sm font-semibold num tabular-nums text-stone-700 dark:text-zinc-300">{totalTonase.toLocaleString('id-ID')} kg</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">Belum Dibayar</p>
              <p className="mt-1 text-sm font-semibold num tabular-nums text-stone-700 dark:text-zinc-300">{jumlahBelum.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-start gap-2">
        <div className="basis-[calc(50%-0.25rem)] grow sm:grow-0 sm:basis-auto min-w-0">
          <DateRangeFilter
            dari={filterDari}
            sampai={filterSampai}
            onChange={(d, s) => { setFilterDari(d); setFilterSampai(s) }}
          />
        </div>
        <div className="basis-[calc(50%-0.25rem)] grow sm:grow-0 sm:basis-auto min-w-0">
          <Select value={filterPeronId} onValueChange={(v) => { if (v) setFilterPeronId(v) }}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs"><SelectValue placeholder="Semua Peron" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Peron</SelectItem>
              {peronOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="basis-full sm:basis-auto sm:ml-auto">
          <PrintRekapButton pembelianList={filtered} />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-stone-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              {(['tanggal', 'peron', 'tonase', 'totalBeli', 'keuntungan'] as const).map((col) => {
                const labels: Record<string, string> = { tanggal: 'Tanggal', peron: 'Peron', tonase: 'Tonase', totalBeli: 'Total Beli', keuntungan: 'Untung' }
                const isRight = ['tonase', 'totalBeli', 'keuntungan'].includes(col)
                const active = sortBy === col
                const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
                return (
                  <th key={col} className={`px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 ${isRight ? 'text-right' : 'text-left'}`}>
                    <button onClick={() => handleSort(col)} className={`inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-zinc-200 transition-colors ${active ? 'text-stone-900 dark:text-zinc-100' : ''}`}>
                      {labels[col]}
                      <Icon className="h-3 w-3" />
                    </button>
                  </th>
                )
              })}
              <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">H.Beli</th>
              <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Kat</th>
              <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Status</th>
              <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Foto</th>
              {isOwner && <th className="px-3 py-3 w-20" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map((p) => (
              <React.Fragment key={p.id}>
                <tr className="bg-white hover:bg-stone-50 dark:hover:bg-white/[0.03] transition-colors group">
                  <td className="px-3 py-2.5 text-stone-700 whitespace-nowrap">{formatTanggal(p.tanggal)}</td>
                  <td className="px-3 py-2.5 font-semibold text-stone-900">{p.peron?.nama ?? p.peronId}</td>
                  <td className="px-3 py-2.5 text-right num text-stone-700">{p.tonase.toLocaleString('id-ID')} kg</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-stone-900 num">{formatRupiah(p.totalBeli)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-green-600 num">{formatRupiah(p.keuntungan)}</td>
                  <td className="px-3 py-2.5 text-right num text-stone-500 text-xs">
                    Rp {p.hargaBeli.toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-medium ${kategoriColor[p.kategori] ?? 'text-stone-600'}`}>
                      {p.kategori}
                    </span>
                  </td>
                  <td className="px-3 py-2.5"><StatusBayar status={p.statusBayarPeron} /></td>
                  <td className="px-3 py-2.5">
                    {p.fotos.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setExpandedFotoId(expandedFotoId === p.id ? null : p.id)}
                        className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300 font-medium"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        {p.fotos.length}
                      </button>
                    ) : (
                      <span className="text-stone-300 text-xs">—</span>
                    )}
                  </td>
                  {isOwner && (
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <PrintNotaButton pembelian={p} nomorUrut={nomorUrutMap.get(p.id) ?? 1} />
                        <PembelianRowMenu
                          id={p.id}
                          onEdit={() => setEditTarget(p)}
                          onDelete={handleDelete}
                          deleting={deletingId}
                        />
                      </div>
                    </td>
                  )}
                </tr>
                {expandedFotoId === p.id && p.fotos.length > 0 && (
                  <tr className="bg-stone-50/50 dark:bg-white/[0.02]">
                    <td colSpan={isOwner ? 11 : 10} className="px-4 py-3">
                      <FotoBuktiGallery urls={p.fotos.map((f) => f.url)} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          {/* Baris total */}
          <tfoot>
            <tr className="bg-stone-100 border-t-2 border-stone-300 font-semibold">
              <td colSpan={2} className="px-3 py-2.5 text-stone-600 text-xs uppercase">
                Total ({filtered.length} tiket)
              </td>
              <td className="px-3 py-2.5 text-right num text-stone-800">
                {totalTonase.toLocaleString('id-ID')} kg
              </td>
              <td className="px-3 py-2.5 text-right num text-stone-900">{formatRupiah(totalBeli)}</td>
              <td className="px-3 py-2.5 text-right num text-green-700">{formatRupiah(totalUntung)}</td>
              <td colSpan={isOwner ? 5 : 4} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile cards — premium */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((p) => {
          const margin = p.totalBeli > 0 ? (p.keuntungan / p.totalBeli) * 100 : 0
          return (
          <div key={p.id} className="rounded-2xl border border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-white/[0.025] p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] text-stone-900 dark:text-zinc-100 leading-snug truncate">{p.peron?.nama ?? p.peronId}</p>
                <p className="text-[11px] text-stone-500 dark:text-zinc-500 mt-0.5">{formatTanggal(p.tanggal)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${kategoriColor[p.kategori] ?? 'text-stone-500'}`}>{p.kategori}</span>
                <StatusBayar status={p.statusBayarPeron} />
              </div>
            </div>

            {/* Hero nominal + margin glance */}
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-zinc-500 font-medium">Total Beli</p>
                <p className="mt-1 text-[22px] font-bold text-stone-900 dark:text-zinc-50 num tabular-nums tracking-tight leading-none truncate">
                  {formatRupiah(p.totalBeli)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-zinc-500 font-medium">Margin</p>
                <p className="mt-1 text-[15px] font-semibold text-stone-900 dark:text-zinc-50 num tabular-nums leading-none">
                  +{margin.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Sub-metrics */}
            <div className="mt-3 pt-3 border-t border-black/[0.05] dark:border-white/[0.05] grid grid-cols-3 gap-3 text-[11px]">
              <div className="min-w-0">
                <p className="text-stone-400 dark:text-zinc-500 uppercase tracking-wider text-[10px]">Tonase</p>
                <p className="mt-0.5 font-semibold text-stone-800 dark:text-zinc-200 num tabular-nums truncate">{p.tonase.toLocaleString('id-ID')} kg</p>
              </div>
              <div className="min-w-0">
                <p className="text-stone-400 dark:text-zinc-500 uppercase tracking-wider text-[10px]">Harga</p>
                <p className="mt-0.5 font-semibold text-stone-800 dark:text-zinc-200 num tabular-nums truncate">{p.hargaBeli.toLocaleString('id-ID')}</p>
              </div>
              <div className="min-w-0">
                <p className="text-stone-400 dark:text-zinc-500 uppercase tracking-wider text-[10px]">Untung</p>
                <p className="mt-0.5 font-semibold text-stone-800 dark:text-zinc-200 num tabular-nums truncate">{formatRupiah(p.keuntungan)}</p>
              </div>
            </div>

            {isOwner && (
              <div className="mt-3 pt-3 border-t border-black/[0.05] dark:border-white/[0.05] flex items-center gap-1">
                <PrintNotaButton pembelian={p} nomorUrut={nomorUrutMap.get(p.id) ?? 1} />
                {p.fotos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpandedFotoId(expandedFotoId === p.id ? null : p.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-medium text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    {p.fotos.length}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditTarget(p)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-stone-600 dark:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />Edit
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-stone-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />Hapus
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus tiket pembelian?</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}
                      >
                        {deletingId === p.id ? 'Menghapus...' : 'Hapus'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            {expandedFotoId === p.id && p.fotos.length > 0 && (
              <div className="mt-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                <FotoBuktiGallery urls={p.fotos.map((f) => f.url)} />
              </div>
            )}
          </div>
          )
        })}

        {/* Mobile total */}
        <div className="rounded-xl border-2 border-stone-300 bg-stone-100 p-4">
          <p className="text-xs font-semibold uppercase text-stone-500 mb-2">Total ({filtered.length} tiket)</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-stone-400">Tonase</p>
              <p className="font-semibold num">{totalTonase.toLocaleString('id-ID')} kg</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Total Beli</p>
              <p className="font-semibold num">{formatRupiah(totalBeli)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Total Jual</p>
              <p className="font-semibold num">{formatRupiah(totalJual)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Keuntungan</p>
              <p className="font-bold text-green-600 num">{formatRupiah(totalUntung)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
