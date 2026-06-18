'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PaymentStatusDot } from '@/components/ui/status-pill'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatTanggal, formatRupiah, formatCompact, formatRentangFilter } from '@/lib/format'
import { deletePembelian } from './actions'
import { PembelianFormDialog } from './pembelian-form-dialog'
import { PrintRekapButton, usePrintNota, useShareNota, generateNoPembelian, type PrintMode } from './invoice-print'
import { RowActionMenu, type RowAction } from '@/components/ui/row-action-menu'
import { EmptyState } from '@/components/empty-state'
import { FotoBuktiGallery } from '@/components/foto-bukti-gallery'
import { DateRangeFilter } from '@/components/date-range-filter'
import { Edit3, Trash2, ShoppingCart, ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, FileText, Thermometer, Zap, Share2 } from 'lucide-react'
import type { Pembelian, Peron, AkunKas, PembelianFoto, PembelianDetail } from '@/lib/db/schema'

type PembelianRow = Pembelian & { peron: Peron | null; sumberBayar: AkunKas | null; fotos: PembelianFoto[]; details: PembelianDetail[] }

interface Props {
  pembelianList: PembelianRow[]
  canEdit: boolean
  canDelete: boolean
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
  return <PaymentStatusDot status={status} />
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

// Semua aksi baris (Cetak 3 mode, Bagikan, Lihat foto, Edit, Hapus) dikumpulkan
// ke SATU kebab (⋯). Cetak/Bagikan/Foto = aksi lihat (semua role); Edit/Hapus
// digate RBAC. Hapus = paling bawah, merah, lewat AlertDialog konfirmasi.
function PembelianRowActions({
  pembelian,
  nomorUrut,
  variant,
  canEdit,
  canDelete,
  deleting,
  onEdit,
  onDelete,
  onToggleFoto,
}: {
  pembelian: PembelianRow
  nomorUrut: number
  variant: 'menu' | 'sheet'
  canEdit: boolean
  canDelete: boolean
  deleting: string | null
  onEdit: () => void
  onDelete: (id: string) => void
  onToggleFoto: () => void
}) {
  const print = usePrintNota(pembelian, nomorUrut)
  const share = useShareNota(pembelian, nomorUrut)
  const fotoCount = pembelian.fotos.length
  const noInvoice = generateNoPembelian(pembelian.tanggal, pembelian.peron?.kode, nomorUrut)

  // Dot kecil = mode cetak terakhir dipakai (dipertahankan dari perilaku lama).
  const dot = (mode: PrintMode) =>
    print.lastMode === mode
      ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" title="Mode terakhir" />
      : null

  const actions: RowAction[] = [
    { key: 'print-lengkap', label: 'Print Lengkap (A5)', icon: FileText, onSelect: print.printLengkap, trailing: dot('lengkap') },
    { key: 'print-thermal', label: 'Print Thermal', icon: Thermometer, onSelect: print.printThermal, trailing: dot('thermal') },
    { key: 'print-thermer', label: 'Cetak ke Thermer', icon: Zap, onSelect: print.printThermer, trailing: dot('thermer') },
    { key: 'share', label: 'Bagikan nota', icon: Share2, onSelect: share.share, separated: true },
    ...(fotoCount > 0
      ? [{ key: 'foto', label: `Lihat foto (${fotoCount})`, icon: ImageIcon, onSelect: onToggleFoto } as RowAction]
      : []),
    ...(canEdit
      ? [{ key: 'edit', label: 'Edit', icon: Edit3, onSelect: onEdit, separated: true } as RowAction]
      : []),
    ...(canDelete
      ? [{
          key: 'delete',
          label: 'Hapus',
          icon: Trash2,
          destructive: true,
          separated: !canEdit,
          onSelect: () => onDelete(pembelian.id),
          confirm: {
            title: 'Hapus tiket pembelian?',
            description: 'Tindakan ini permanen dan ikut menghapus mutasi kas terkait.',
            confirmLabel: 'Hapus',
            busyLabel: 'Menghapus…',
            busy: deleting === pembelian.id,
          },
        } as RowAction]
      : []),
  ]

  return (
    <RowActionMenu
      variant={variant}
      title={pembelian.peron?.nama ?? pembelian.peronId}
      subtitle={noInvoice}
      actions={actions}
      triggerLabel="Aksi tiket"
    />
  )
}

export function PembelianTable({ pembelianList, canEdit, canDelete, peronOptions, akunOptions }: Props) {
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
  const rangeLabel = formatRentangFilter(filterDari, filterSampai)

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
            <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">Total Beli</p>
            <p className="mt-1.5 text-[2.25rem] sm:text-[2.75rem] font-bold num tabular-nums tracking-[-0.03em] leading-none text-stone-900 dark:text-zinc-50">
              {formatCompact(totalBeli)}
            </p>
            <p className="mt-1.5 text-[11px] text-stone-400 dark:text-zinc-500">
              {isFiltered
                ? `Dibayar ke peron · ${filtered.length} tiket${rangeLabel ? ` · ${rangeLabel}` : ''}`
                : 'Dibayar ke peron · seluruh tiket'}
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
              {/* Aksen amber = sinyal perhatian saat masih ada tiket belum dibayar. */}
              <p className={`mt-1 text-sm font-semibold num tabular-nums ${jumlahBelum > 0 ? 'text-warn' : 'text-stone-700 dark:text-zinc-300'}`}>{jumlahBelum.toLocaleString('id-ID')}</p>
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
      <div className="hidden md:block surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 dark:bg-white/[0.03] border-b border-stone-200 dark:border-border">
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
              <th className="px-3 py-3 w-14" />
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
                  <td className="px-3 py-2.5 text-right font-semibold text-ok num">{formatRupiah(p.keuntungan)}</td>
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
                      <span className="text-stone-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end">
                      <PembelianRowActions
                        pembelian={p}
                        nomorUrut={nomorUrutMap.get(p.id) ?? 1}
                        variant="menu"
                        canEdit={canEdit}
                        canDelete={canDelete}
                        deleting={deletingId}
                        onEdit={() => setEditTarget(p)}
                        onDelete={handleDelete}
                        onToggleFoto={() => setExpandedFotoId(expandedFotoId === p.id ? null : p.id)}
                      />
                    </div>
                  </td>
                </tr>
                {expandedFotoId === p.id && p.fotos.length > 0 && (
                  <tr className="bg-stone-50/50 dark:bg-white/[0.02]">
                    <td colSpan={10} className="px-4 py-3">
                      <FotoBuktiGallery urls={p.fotos.map((f) => f.url)} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          {/* Baris total */}
          <tfoot>
            <tr className="bg-stone-100 dark:bg-white/[0.04] border-t-2 border-stone-300 dark:border-border font-semibold">
              <td colSpan={2} className="px-3 py-2.5 text-stone-600 text-xs uppercase">
                Total ({filtered.length} tiket)
              </td>
              <td className="px-3 py-2.5 text-right num text-stone-800">
                {totalTonase.toLocaleString('id-ID')} kg
              </td>
              <td className="px-3 py-2.5 text-right num text-stone-900">{formatRupiah(totalBeli)}</td>
              <td className={`px-3 py-2.5 text-right num ${totalUntung > 0 ? 'text-ok' : totalUntung < 0 ? 'text-crit' : 'text-stone-700 dark:text-zinc-300'}`}>{formatRupiah(totalUntung)}</td>
              <td colSpan={5} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile cards — premium */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((p) => {
          // Margin tak bisa dihitung (totalBeli 0) → placeholder netral "—".
          const canMargin = p.totalBeli > 0
          const margin = canMargin ? (p.keuntungan / p.totalBeli) * 100 : 0
          return (
          <div key={p.id} className="surface p-4">
            {/* Header — satu kebab (⋯) di ujung kanan menampung semua aksi baris. */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] text-stone-900 dark:text-zinc-100 leading-snug truncate">{p.peron?.nama ?? p.peronId}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-[11px] text-stone-500 dark:text-zinc-500">{formatTanggal(p.tanggal)}</p>
                  <FotoIndicator count={p.fotos.length} />
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${kategoriColor[p.kategori] ?? 'text-stone-500'}`}>{p.kategori}</span>
                <StatusBayar status={p.statusBayarPeron} />
              </div>
              <PembelianRowActions
                pembelian={p}
                nomorUrut={nomorUrutMap.get(p.id) ?? 1}
                variant="sheet"
                canEdit={canEdit}
                canDelete={canDelete}
                deleting={deletingId}
                onEdit={() => setEditTarget(p)}
                onDelete={handleDelete}
                onToggleFoto={() => setExpandedFotoId(expandedFotoId === p.id ? null : p.id)}
              />
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
                {/* Margin positif = cue emerald hemat (satu nilai per kartu). */}
                <p className={`mt-1 text-[15px] font-semibold num tabular-nums leading-none ${canMargin && margin > 0 ? 'text-ok' : 'text-stone-900 dark:text-zinc-50'}`}>
                  {canMargin ? `+${margin.toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>

            {expandedFotoId === p.id && p.fotos.length > 0 && (
              <div className="mt-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                <FotoBuktiGallery urls={p.fotos.map((f) => f.url)} />
              </div>
            )}
          </div>
          )
        })}

        {/* Mobile total — hanya nilai yg belum tampil di hero atas (Total Jual, Keuntungan) */}
        <div className="surface p-4">
          <p className="text-xs font-semibold uppercase text-stone-500 mb-2">Total ({filtered.length} tiket)</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-stone-400">Total Jual</p>
              <p className="font-semibold num">{formatRupiah(totalJual)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Keuntungan</p>
              <p className={`font-bold num ${totalUntung > 0 ? 'text-ok' : totalUntung < 0 ? 'text-crit' : 'text-stone-900 dark:text-zinc-50'}`}>{formatRupiah(totalUntung)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
