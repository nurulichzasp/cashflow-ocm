'use client'

import { useState, useMemo, useEffect, useEffectEvent, useTransition } from 'react'
import { toast } from 'sonner'
import { ArahIndicator } from '@/components/ui/status-pill'
import { EmptyState } from '@/components/empty-state'
import { LoadMoreBar } from '@/components/load-more-bar'
import { LIST_PAGE_SIZE } from '@/lib/pagination'
import { deleteTransaksiKas, getKasTransactions } from './actions'
import { KasFormDialog } from './kas-form-dialog'
import { formatRupiah, formatTanggal, formatCompact, formatRentangFilter } from '@/lib/format'
import { Trash2, Wallet, ArrowUpDown, ArrowUp, ArrowDown, Pencil } from 'lucide-react'
import { DateRangeFilter } from '@/components/date-range-filter'
import { RowActionMenu, type RowAction } from '@/components/ui/row-action-menu'
import type { TransaksiKas, AkunKas } from '@/lib/db/schema'

type TransaksiRow = TransaksiKas & { akun: AkunKas | null }

const kategoriLabels: Record<TransaksiKas['kategori'], string> = {
  penerimaan_bga: 'Penerimaan Penjualan',
  tarik_bri: 'Tarik / Transfer',
  bayar_peron: 'Bayar Peron',
  modal_peron: 'Modal Peron',
  kembali_modal: 'Kembali Modal',
  biaya_operasional: 'Biaya Operasional',
  penyesuaian: 'Penyesuaian',
  lainnya: 'Lainnya',
}

interface Props {
  transaksiList: TransaksiRow[]
  stats: { totalMasuk: number; totalKeluar: number; totalCount: number; netPerAkun: Record<string, number> }
  isOwner: boolean
}

type SortCol = 'tanggal' | 'jumlah'

/* ─── Kartu mobile — aksi (Edit/Hapus) terkumpul di kebab ⋯ ─── */
function KasCard({
  item,
  isOwner,
  akunOptions,
  onDelete,
  deleting,
}: {
  item: TransaksiRow
  isOwner: boolean
  akunOptions: { id: string; nama: string; tipe: string }[]
  onDelete: (id: string) => void
  deleting: string | null
}) {
  const [editOpen, setEditOpen] = useState(false)
  const masuk = item.arah === 'masuk'
  const canEdit = !item.refTabel

  const actions: RowAction[] = [
    ...(canEdit
      ? [{ key: 'edit', label: 'Edit', icon: Pencil, onSelect: () => setEditOpen(true) } as RowAction]
      : []),
    ...(isOwner
      ? [{
          key: 'delete',
          label: 'Hapus',
          icon: Trash2,
          destructive: true,
          separated: canEdit,
          onSelect: () => onDelete(item.id),
          confirm: {
            title: 'Hapus transaksi?',
            description: `Transaksi ${kategoriLabels[item.kategori]} pada ${formatTanggal(item.tanggal)} sebesar ${formatRupiah(item.jumlah)} akan dihapus.`,
            confirmLabel: 'Hapus',
            busyLabel: 'Menghapus…',
            busy: deleting === item.id,
          },
        } as RowAction]
      : []),
  ]

  return (
    <div className="surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-stone-900 dark:text-zinc-100 truncate">{kategoriLabels[item.kategori]}</p>
          <p className="mt-0.5 truncate text-xs text-stone-500">{formatTanggal(item.tanggal)} · {item.akun?.nama ?? item.akunId}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ArahIndicator arah={item.arah} />
          {actions.length > 0 && (
            <RowActionMenu
              variant="sheet"
              title={kategoriLabels[item.kategori]}
              subtitle={formatTanggal(item.tanggal)}
              actions={actions}
              triggerLabel="Aksi transaksi"
            />
          )}
        </div>
      </div>
      <p className={`mt-2 inline-flex items-center gap-1 text-base font-bold num ${masuk ? 'text-stone-900 dark:text-zinc-50' : 'text-stone-500 dark:text-zinc-400'}`}>
        {masuk ? <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        {masuk ? '+' : '-'}{formatRupiah(item.jumlah)}
      </p>
      {item.catatan && <p className="mt-2 text-xs text-stone-500">{item.catatan}</p>}

      {canEdit && editOpen && (
        <KasFormDialog editItem={item} akunOptions={akunOptions} open={editOpen} onOpenChange={setEditOpen} />
      )}
    </div>
  )
}

/* ─── Baris desktop — aksi (Edit/Hapus) di kebab ⋯ (sama spt mobile & Pembelian) ─── */
function KasDesktopRow({
  item,
  isOwner,
  akunOptions,
  onDelete,
  deleting,
}: {
  item: TransaksiRow
  isOwner: boolean
  akunOptions: { id: string; nama: string; tipe: string }[]
  onDelete: (id: string) => void
  deleting: string | null
}) {
  const [editOpen, setEditOpen] = useState(false)
  const canEdit = !item.refTabel

  const actions: RowAction[] = [
    ...(canEdit
      ? [{ key: 'edit', label: 'Edit', icon: Pencil, onSelect: () => setEditOpen(true) } as RowAction]
      : []),
    ...(isOwner
      ? [{
          key: 'delete',
          label: 'Hapus',
          icon: Trash2,
          destructive: true,
          separated: canEdit,
          onSelect: () => onDelete(item.id),
          confirm: {
            title: 'Hapus transaksi?',
            description: `Transaksi ${kategoriLabels[item.kategori]} pada ${formatTanggal(item.tanggal)} sebesar ${formatRupiah(item.jumlah)} akan dihapus.`,
            confirmLabel: 'Hapus',
            busyLabel: 'Menghapus…',
            busy: deleting === item.id,
          },
        } as RowAction]
      : []),
  ]

  return (
    <tr className="bg-white hover:bg-stone-50 dark:hover:bg-white/[0.03] transition-colors">
      <td className="px-4 py-3 text-stone-900">{formatTanggal(item.tanggal)}</td>
      <td className="px-4 py-3">
        <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700 max-w-[120px] truncate">
          {item.akun?.nama ?? item.akunId}
        </span>
      </td>
      <td className="px-4 py-3 text-stone-700">{kategoriLabels[item.kategori]}</td>
      <td className="px-4 py-3">
        <ArahIndicator arah={item.arah} />
      </td>
      <td className={`px-4 py-3 text-right font-semibold num ${item.arah === 'masuk' ? 'text-stone-900 dark:text-zinc-50' : 'text-stone-500 dark:text-zinc-400'}`}>
        <span className="inline-flex items-center justify-end gap-1">
          {item.arah === 'masuk' ? <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          {item.arah === 'masuk' ? '+' : '-'}{formatRupiah(item.jumlah)}
        </span>
      </td>
      <td className="px-4 py-3 text-stone-500 max-w-[180px] truncate">{item.catatan ?? <span className="text-stone-400">—</span>}</td>
      <td className="px-4 py-3 text-right">
        {actions.length > 0 && (
          <RowActionMenu variant="menu" actions={actions} triggerLabel="Aksi transaksi" />
        )}
        {canEdit && editOpen && (
          <KasFormDialog editItem={item} akunOptions={akunOptions} open={editOpen} onOpenChange={setEditOpen} />
        )}
      </td>
    </tr>
  )
}

export function KasTable({ transaksiList, stats, isOwner }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [sortBy, setSortBy] = useState<SortCol>('tanggal')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Paginasi window: transaksiList = LIST_PAGE_SIZE baris terbaru dari server.
  // extraRows = halaman lanjutan ("Muat lebih banyak"); rangeRows = SEMUA baris
  // rentang saat filter tanggal aktif (di-fetch server, agar ringkasan rentang
  // tetap persis benar). Prop transaksiList berubah setelah revalidate (tambah/
  // edit/hapus) → efek di bawah menyegarkan data klien agar tak basi.
  const [extraRows, setExtraRows] = useState<TransaksiRow[]>([])
  const getExtraRowsCount = useEffectEvent(() => extraRows.length)
  const [rangeRows, setRangeRows] = useState<TransaksiRow[] | null>(null)
  const [isPending, startTransition] = useTransition()
  const isFiltered = !!dari || !!sampai

  useEffect(() => {
    if (!dari && !sampai) return
    let cancelled = false
    startTransition(async () => {
      try {
        const rows = await getKasTransactions({ dari: dari || undefined, sampai: sampai || undefined }) as TransaksiRow[]
        if (!cancelled) setRangeRows(rows)
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : 'Gagal memuat filter kas')
      }
    })
    // transaksiList sengaja jadi dependency: revalidate server (habis mutasi)
    // memicu refetch rentang/halaman-ekstra supaya data klien ikut segar.
    return () => { cancelled = true }
  }, [dari, sampai, transaksiList])

  useEffect(() => {
    // Habis mutasi (prop window berubah), halaman-ekstra yang sudah dimuat
    // di-refetch supaya baris terhapus/teredit tidak basi.
    const count = getExtraRowsCount()
    if (count === 0) return
    let cancelled = false
    getKasTransactions({ offset: LIST_PAGE_SIZE, limit: count })
      .then((rows) => { if (!cancelled) setExtraRows(rows as TransaksiRow[]) })
      .catch((error) => { if (!cancelled) toast.error(error instanceof Error ? error.message : 'Gagal menyegarkan daftar kas') })
    return () => { cancelled = true }
  }, [transaksiList])

  function handleDateFilter(d: string, s: string) {
    setRangeRows(null)
    setDari(d)
    setSampai(s)
  }

  function loadMore() {
    startTransition(async () => {
      const next = await getKasTransactions({ offset: LIST_PAGE_SIZE + extraRows.length, limit: LIST_PAGE_SIZE }) as TransaksiRow[]
      setExtraRows((prev) => [...prev, ...next])
    })
  }

  function handleSort(col: SortCol) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const baseRows = useMemo(() => {
    if (isFiltered && rangeRows) return rangeRows
    if (extraRows.length === 0) return transaksiList
    const seen = new Set(transaksiList.map((t) => t.id))
    return [...transaksiList, ...extraRows.filter((t) => !seen.has(t.id))]
  }, [isFiltered, rangeRows, transaksiList, extraRows])

  // Opsi akun diturunkan dari baris yang ada (untuk dialog edit) — dedup by id.
  const akunOptions = useMemo(() => {
    const map = new Map<string, { id: string; nama: string; tipe: string }>()
    for (const t of baseRows) {
      if (t.akun && !map.has(t.akun.id)) {
        map.set(t.akun.id, { id: t.akun.id, nama: t.akun.nama, tipe: t.akun.tipe })
      }
    }
    return Array.from(map.values())
  }, [baseRows])

  const filtered = useMemo(() => {
    let list = [...baseRows]
    if (dari) list = list.filter(t => t.tanggal >= dari)
    if (sampai) list = list.filter(t => t.tanggal <= sampai)
    list.sort((a, b) => {
      if (sortBy === 'tanggal') { const c = a.tanggal.localeCompare(b.tanggal); return sortDir === 'asc' ? c : -c }
      return sortDir === 'asc' ? a.jumlah - b.jumlah : b.jumlah - a.jumlah
    })
    return list
  }, [baseRows, dari, sampai, sortBy, sortDir])

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteTransaksiKas(id)
      toast.success('Transaksi berhasil dihapus')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus transaksi')
    } finally {
      setDeletingId(null)
    }
  }

  if (stats.totalCount === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Belum ada transaksi kas"
        description="Tambahkan transaksi untuk mulai mencatat arus kas."
      />
    )
  }

  const rangeLabel = formatRentangFilter(dari, sampai)
  // Tanpa filter = agregat SQL all-time (benar walau list terpaginasi);
  // dengan filter = jumlah atas SEMUA baris rentang (rangeRows dari server).
  const totalMasuk = isFiltered
    ? filtered.filter((t) => t.arah === 'masuk').reduce((s, t) => s + t.jumlah, 0)
    : stats.totalMasuk
  const totalKeluar = isFiltered
    ? filtered.filter((t) => t.arah === 'keluar').reduce((s, t) => s + t.jumlah, 0)
    : stats.totalKeluar
  const hasMore = !isFiltered && baseRows.length < stats.totalCount

  return (
    <div className="space-y-3">
      {/* Masuk / Keluar — IKUT filter (saldo akun = kumulatif, tetap di page). */}
      <div className="surface grid grid-cols-2 divide-x divide-stone-100 dark:divide-border">
        <div className="p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1.5">Masuk</p>
          <p className="text-xl font-bold num tabular-nums text-stone-900 dark:text-zinc-50">{formatCompact(totalMasuk)}</p>
        </div>
        <div className="p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1.5">Keluar</p>
          <p className="text-xl font-bold num tabular-nums text-stone-900 dark:text-zinc-50">{formatCompact(totalKeluar)}</p>
        </div>
      </div>
      {isFiltered && (
        <p className="px-1 text-[11px] text-stone-400 dark:text-zinc-500">Ringkasan untuk {rangeLabel}</p>
      )}

      {/* Filter tanggal/bulan */}
      <DateRangeFilter dari={dari} sampai={sampai} onChange={handleDateFilter} />

      {/* Desktop */}
      <div className="hidden md:block surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 dark:bg-white/[0.03] border-b border-stone-200 dark:border-border">
              <th scope="col" aria-sort={sortBy === 'tanggal' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <button type="button" onClick={() => handleSort('tanggal')} className="inline-flex items-center gap-1 select-none hover:text-stone-700 dark:hover:text-zinc-300">Tanggal {sortBy === 'tanggal' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</button>
              </th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Akun</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Kategori</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Arah</th>
              <th scope="col" aria-sort={sortBy === 'jumlah' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <button type="button" onClick={() => handleSort('jumlah')} className="inline-flex items-center gap-1 justify-end w-full hover:text-stone-700 dark:hover:text-zinc-300">Jumlah {sortBy === 'jumlah' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</button>
              </th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Catatan</th>
              <th scope="col" className="px-4 py-3 w-10"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map((item) => (
              <KasDesktopRow
                key={item.id}
                item={item}
                isOwner={isOwner}
                akunOptions={akunOptions}
                onDelete={handleDelete}
                deleting={deletingId}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile — aksi ditampung di kebab ⋯ (sama spt Pembelian) */}
      <div className="md:hidden space-y-2">
        {filtered.map((item) => (
          <KasCard
            key={item.id}
            item={item}
            isOwner={isOwner}
            akunOptions={akunOptions}
            onDelete={handleDelete}
            deleting={deletingId}
          />
        ))}
      </div>

      <LoadMoreBar
        shown={filtered.length}
        total={isFiltered ? filtered.length : stats.totalCount}
        hasMore={hasMore}
        loading={isPending}
        onLoadMore={loadMore}
        unit="transaksi"
      />
    </div>
  )
}
