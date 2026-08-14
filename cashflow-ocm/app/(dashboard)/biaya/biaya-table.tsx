'use client'

import React, { useState, useMemo, useEffect, useEffectEvent, useTransition } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/empty-state'
import { LoadMoreBar } from '@/components/load-more-bar'
import { LIST_PAGE_SIZE } from '@/lib/pagination'
import { deleteBiayaOperasional, getBiayaList } from './actions'
import { BiayaFormDialog } from './biaya-form-dialog'
import { formatRupiah, formatTanggal, formatCompact, formatRentangFilter } from '@/lib/format'
import { FotoBuktiGallery } from '@/components/foto-bukti-gallery'
import { Trash2, Receipt, ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, Pencil } from 'lucide-react'
import { DateRangeFilter } from '@/components/date-range-filter'
import { RowActionMenu, type RowAction } from '@/components/ui/row-action-menu'
import type { BiayaOperasional, AkunKas, BiayaFoto } from '@/lib/db/schema'

type BiayaRow = BiayaOperasional & { akunSumber: AkunKas | null; fotos: BiayaFoto[] }

const kategoriLabels: Record<BiayaOperasional['kategori'], string> = {
  gaji: 'Gaji',
  solar: 'Solar',
  transport: 'Transport',
  lainnya: 'Lainnya',
}

/** Label kategori — pakai nama custom bila kategori = 'lainnya' & terisi. */
function kategoriDisplay(item: Pick<BiayaRow, 'kategori' | 'kategoriLain'>): string {
  return item.kategori === 'lainnya' && item.kategoriLain?.trim()
    ? item.kategoriLain.trim()
    : kategoriLabels[item.kategori]
}

const kategoriTextCls = 'text-[11px] font-medium uppercase tracking-wider text-stone-500 dark:text-zinc-400'

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown className="h-3 w-3" />
  return dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
}

type AkunOption = { id: string; nama: string; tipe: string }

interface Props {
  biayaList: BiayaRow[]
  stats: { totalCount: number; totalBiaya: number }
  isOwner: boolean
  akunOptions: AkunOption[]
}

type SortCol = 'tanggal' | 'jumlah'

/* ─── Kartu mobile — Edit/Hapus terkumpul di kebab ⋯ ─── */
function BiayaCard({
  item,
  isOwner,
  akunOptions,
  onDelete,
  deleting,
}: {
  item: BiayaRow
  isOwner: boolean
  akunOptions: AkunOption[]
  onDelete: (id: string) => void
  deleting: string | null
}) {
  const [editOpen, setEditOpen] = useState(false)

  const actions: RowAction[] = [
    { key: 'edit', label: 'Edit', icon: Pencil, onSelect: () => setEditOpen(true) },
    ...(isOwner
      ? [{
          key: 'delete',
          label: 'Hapus',
          icon: Trash2,
          destructive: true,
          separated: true,
          onSelect: () => onDelete(item.id),
          confirm: {
            title: 'Hapus biaya?',
            description: `Biaya ${kategoriDisplay(item)} pada ${formatTanggal(item.tanggal)} sebesar ${formatRupiah(item.jumlah)} akan dihapus.`,
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
          <span className={kategoriTextCls}>{kategoriDisplay(item)}</span>
          <p className="mt-1 truncate text-xs text-stone-500">
            {formatTanggal(item.tanggal)} · {item.akunSumber?.nama ?? item.akunSumberId}
          </p>
        </div>
        <RowActionMenu
          variant="sheet"
          title={kategoriDisplay(item)}
          subtitle={formatTanggal(item.tanggal)}
          actions={actions}
          triggerLabel="Aksi biaya"
        />
      </div>
      <p className="mt-2 text-lg font-bold text-stone-900 dark:text-zinc-50 num">{formatRupiah(item.jumlah)}</p>
      {item.catatan && <p className="mt-2 text-xs text-stone-500">{item.catatan}</p>}
      {item.fotos.length > 0 && (
        <div className="mt-3 border-t border-stone-100 pt-3 dark:border-border">
          <FotoBuktiGallery urls={item.fotos.map((f) => f.url)} maxThumbnails={3} />
        </div>
      )}

      {editOpen && (
        <BiayaFormDialog editItem={item} akunOptions={akunOptions} open={editOpen} onOpenChange={setEditOpen} />
      )}
    </div>
  )
}

/* ─── Baris desktop — Edit/Hapus di kebab ⋯ (sama spt mobile & Pembelian) ─── */
function BiayaDesktopRow({
  item,
  isOwner,
  akunOptions,
  onDelete,
  deleting,
  onToggleFoto,
}: {
  item: BiayaRow
  isOwner: boolean
  akunOptions: AkunOption[]
  onDelete: (id: string) => void
  deleting: string | null
  onToggleFoto: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)

  const actions: RowAction[] = [
    { key: 'edit', label: 'Edit', icon: Pencil, onSelect: () => setEditOpen(true) },
    ...(isOwner
      ? [{
          key: 'delete',
          label: 'Hapus',
          icon: Trash2,
          destructive: true,
          separated: true,
          onSelect: () => onDelete(item.id),
          confirm: {
            title: 'Hapus biaya?',
            description: `Biaya ${kategoriDisplay(item)} pada ${formatTanggal(item.tanggal)} sebesar ${formatRupiah(item.jumlah)} akan dihapus.`,
            confirmLabel: 'Hapus',
            busyLabel: 'Menghapus…',
            busy: deleting === item.id,
          },
        } as RowAction]
      : []),
  ]

  return (
    <tr className="bg-white hover:bg-stone-50 dark:hover:bg-white/[0.03] transition-colors">
      <td className="px-4 py-3 text-stone-900 dark:text-stone-100">{formatTanggal(item.tanggal)}</td>
      <td className="px-4 py-3">
        <span className={kategoriTextCls}>{kategoriDisplay(item)}</span>
      </td>
      <td className="px-4 py-3">
        <span className="block max-w-[140px] truncate text-sm text-stone-600 dark:text-zinc-300">
          {item.akunSumber?.nama ?? item.akunSumberId}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-semibold text-stone-900 num">{formatRupiah(item.jumlah)}</td>
      <td className="px-4 py-3 text-stone-500 max-w-[200px] truncate">{item.catatan ?? <span className="text-stone-400">—</span>}</td>
      <td className="px-4 py-3">
        {item.fotos.length > 0 ? (
          <button
            type="button"
            onClick={onToggleFoto}
            className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300 font-medium"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {item.fotos.length} foto
          </button>
        ) : (
          <span className="text-stone-400 text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <RowActionMenu variant="menu" actions={actions} triggerLabel="Aksi biaya" />
        {editOpen && (
          <BiayaFormDialog editItem={item} akunOptions={akunOptions} open={editOpen} onOpenChange={setEditOpen} />
        )}
      </td>
    </tr>
  )
}

export function BiayaTable({ biayaList, stats, isOwner, akunOptions }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedFotoId, setExpandedFotoId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortCol>('tanggal')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')

  // Paginasi window (pola Kas): biayaList = LIST_PAGE_SIZE baris terbaru dari
  // server. extraRows = halaman lanjutan ("Muat lebih banyak"); rangeRows =
  // SEMUA baris rentang saat filter tanggal aktif (di-fetch server, agar
  // ringkasan rentang tetap persis benar). Prop biayaList berubah setelah
  // revalidate (tambah/edit/hapus) → efek di bawah menyegarkan data klien.
  const [extraRows, setExtraRows] = useState<BiayaRow[]>([])
  const getExtraRowsCount = useEffectEvent(() => extraRows.length)
  const [rangeRows, setRangeRows] = useState<BiayaRow[] | null>(null)
  const [isPending, startTransition] = useTransition()
  const isFiltered = !!dari || !!sampai

  useEffect(() => {
    if (!dari && !sampai) return
    let cancelled = false
    startTransition(async () => {
      try {
        const rows = await getBiayaList({ dari: dari || undefined, sampai: sampai || undefined }) as BiayaRow[]
        if (!cancelled) setRangeRows(rows)
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : 'Gagal memuat filter biaya')
      }
    })
    // biayaList sengaja jadi dependency: revalidate server (habis mutasi)
    // memicu refetch rentang/halaman-ekstra supaya data klien ikut segar.
    return () => { cancelled = true }
  }, [dari, sampai, biayaList])

  useEffect(() => {
    // Habis mutasi (prop window berubah), halaman-ekstra yang sudah dimuat
    // di-refetch supaya baris terhapus/teredit tidak basi.
    const count = getExtraRowsCount()
    if (count === 0) return
    let cancelled = false
    getBiayaList({ offset: LIST_PAGE_SIZE, limit: count })
      .then((rows) => { if (!cancelled) setExtraRows(rows as BiayaRow[]) })
      .catch((error) => { if (!cancelled) toast.error(error instanceof Error ? error.message : 'Gagal menyegarkan daftar biaya') })
    return () => { cancelled = true }
  }, [biayaList])

  function handleDateFilter(d: string, s: string) {
    setRangeRows(null)
    setDari(d)
    setSampai(s)
  }

  function loadMore() {
    startTransition(async () => {
      const next = await getBiayaList({ offset: LIST_PAGE_SIZE + extraRows.length, limit: LIST_PAGE_SIZE }) as BiayaRow[]
      setExtraRows((prev) => [...prev, ...next])
    })
  }

  function handleSort(col: SortCol) {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const baseRows = useMemo(() => {
    if (isFiltered && rangeRows) return rangeRows
    if (extraRows.length === 0) return biayaList
    const seen = new Set(biayaList.map((b) => b.id))
    return [...biayaList, ...extraRows.filter((b) => !seen.has(b.id))]
  }, [isFiltered, rangeRows, biayaList, extraRows])

  const sorted = useMemo(() => {
    let list = [...baseRows]
    if (dari) list = list.filter(b => b.tanggal >= dari)
    if (sampai) list = list.filter(b => b.tanggal <= sampai)
    list.sort((a, b) => {
      const cmp = sortBy === 'tanggal' ? a.tanggal.localeCompare(b.tanggal) : a.jumlah - b.jumlah
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [baseRows, sortBy, sortDir, dari, sampai])

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteBiayaOperasional(id)
      toast.success('Biaya berhasil dihapus')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus biaya')
    } finally {
      setDeletingId(null)
    }
  }

  // Empty-state dari agregat SQL, bukan panjang window (pola Kas) — window
  // yang terpaginasi bukan bukti data benar-benar kosong.
  if (stats.totalCount === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Belum ada biaya tercatat"
        description="Tambahkan biaya operasional untuk melihat ringkasan pengeluaran."
      />
    )
  }

  const rangeLabel = formatRentangFilter(dari, sampai)
  // Tanpa filter = agregat SQL all-time (benar walau list terpaginasi);
  // dengan filter = jumlah atas SEMUA baris rentang (rangeRows dari server).
  const totalBiaya = isFiltered
    ? sorted.reduce((s, b) => s + b.jumlah, 0)
    : stats.totalBiaya
  // Rincian per kategori dari baris yang dimuat klien (window + halaman ekstra;
  // saat filter = seluruh rentang). Tanpa filter, chips bisa < totalBiaya all-time.
  const perKategori = (() => {
    const map = new Map<string, number>()
    for (const b of sorted) {
      const label = kategoriDisplay(b)
      map.set(label, (map.get(label) ?? 0) + b.jumlah)
    }
    return Array.from(map.entries()).map(([label, total]) => ({ label, total })).filter((k) => k.total > 0)
  })()

  return (
    <div className="space-y-3">
      {/* Hero Total Pengeluaran — IKUT filter (pola Pembelian). */}
      <div className="space-y-2.5">
        <div className="surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Total Pengeluaran</p>
          <p className="text-2xl font-bold text-stone-900 dark:text-zinc-50 num tabular-nums">{formatCompact(totalBiaya)}</p>
          <p className="text-xs text-stone-400 mt-1">
            {/* Tanpa filter: hitung dari agregat SQL, bukan panjang window. */}
            {isFiltered ? `${sorted.length} entri · ${rangeLabel}` : `${stats.totalCount} entri tercatat`}
          </p>
        </div>
        {perKategori.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[13px] text-stone-500 dark:text-stone-400">
            {perKategori.map((k) => (
              <span key={k.label}>
                {k.label} <span className="font-semibold text-stone-800 dark:text-zinc-200 num">{formatCompact(k.total)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Filter tanggal/bulan */}
      <DateRangeFilter dari={dari} sampai={sampai} onChange={handleDateFilter} />

      {/* Desktop */}
      <div className="hidden md:block surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 dark:bg-white/[0.03] border-b border-stone-200 dark:border-border">
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <button type="button" onClick={() => handleSort('tanggal')} className={`inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-zinc-200 transition-colors ${sortBy === 'tanggal' ? 'text-stone-900 dark:text-zinc-100' : ''}`}>
                  Tanggal <SortIcon active={sortBy === 'tanggal'} dir={sortDir} />
                </button>
              </th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Kategori</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Sumber</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <button type="button" onClick={() => handleSort('jumlah')} className={`inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-zinc-200 transition-colors ${sortBy === 'jumlah' ? 'text-stone-900 dark:text-zinc-100' : ''}`}>
                  Jumlah <SortIcon active={sortBy === 'jumlah'} dir={sortDir} />
                </button>
              </th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Catatan</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Foto</th>
              <th scope="col" className="px-4 py-3 w-10"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sorted.map((item) => (
              <React.Fragment key={item.id}>
                <BiayaDesktopRow
                  item={item}
                  isOwner={isOwner}
                  akunOptions={akunOptions}
                  onDelete={handleDelete}
                  deleting={deletingId}
                  onToggleFoto={() => setExpandedFotoId(expandedFotoId === item.id ? null : item.id)}
                />
                {expandedFotoId === item.id && item.fotos.length > 0 && (
                  <tr className="bg-stone-50/50 dark:bg-white/[0.02]">
                    <td colSpan={7} className="px-5 py-3">
                      <FotoBuktiGallery urls={item.fotos.map((f) => f.url)} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile — aksi di kebab ⋯ */}
      <div className="md:hidden space-y-2">
        {sorted.map((item) => (
          <BiayaCard
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
        shown={sorted.length}
        total={isFiltered ? sorted.length : stats.totalCount}
        hasMore={!isFiltered && baseRows.length < stats.totalCount}
        loading={isPending}
        onLoadMore={loadMore}
        unit="biaya"
      />
    </div>
  )
}
