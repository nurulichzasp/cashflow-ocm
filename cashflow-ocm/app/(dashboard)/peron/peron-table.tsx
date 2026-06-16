'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { StatusPill } from '@/components/ui/status-pill'
import { EmptyState } from '@/components/empty-state'
import { RowActionMenu, type RowAction } from '@/components/ui/row-action-menu'
import { formatRupiah } from '@/lib/format'
import { PeronFormDialog } from './peron-form-dialog'
import { ModalFormDialog } from './modal-form-dialog'
import { deletePeron } from './actions'
import { Edit, Trash2, Wallet, Users, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { Peron } from '@/lib/db/schema'

type PeronRow = Peron & { dpAktif: number }

function RowActions({ p, isOwner, onDelete, deleting, akunOptions = [], variant = 'menu' }: { p: PeronRow; isOwner: boolean; onDelete: (id: string) => void; deleting: string | null; akunOptions?: AkunOption[]; variant?: 'menu' | 'sheet' }) {
  const [editOpen, setEditOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const actions: RowAction[] = [
    { key: 'modal', label: 'Kelola DP/Modal', icon: Wallet, onSelect: () => setModalOpen(true) },
    { key: 'edit', label: 'Edit', icon: Edit, onSelect: () => setEditOpen(true) },
    ...(isOwner
      ? [{
          key: 'delete',
          label: 'Hapus',
          icon: Trash2,
          destructive: true,
          separated: true,
          onSelect: () => onDelete(p.id),
          confirm: {
            title: 'Hapus Peron?',
            description: `Data peron ${p.nama} beserta seluruh riwayat modal akan dihapus permanen. Aksi ini tidak dapat dibatalkan.`,
            confirmLabel: 'Ya, Hapus',
            busyLabel: 'Menghapus…',
            busy: deleting === p.id,
          },
        } as RowAction]
      : []),
  ]

  return (
    <>
      <RowActionMenu
        variant={variant}
        title={p.nama}
        subtitle={p.kode != null ? `#${p.kode}` : undefined}
        actions={actions}
        triggerLabel="Aksi peron"
      />
      {modalOpen && <ModalFormDialog peronId={p.id} peronNama={p.nama} akunOptions={akunOptions} open={modalOpen} onOpenChange={setModalOpen} />}
      {editOpen && <PeronFormDialog mode="edit" peron={p} open={editOpen} onOpenChange={setEditOpen} />}
    </>
  )
}

type PeronWithDp = Peron & { dpAktif: number }

interface AkunOption { id: string; nama: string; tipe: string }

interface Props {
  peronList: PeronWithDp[]
  isOwner: boolean
  akunOptions?: AkunOption[]
}

type SortCol = 'nama' | 'keuntungan' | 'dp'

export function PeronTable({ peronList, isOwner, akunOptions = [] }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortCol>('nama')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function handleSort(col: SortCol) {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const sorted = useMemo(() => [...peronList].sort((a, b) => {
    let cmp = 0
    if (sortBy === 'nama') cmp = a.nama.localeCompare(b.nama)
    else if (sortBy === 'keuntungan') cmp = a.keuntunganPerKg - b.keuntunganPerKg
    else if (sortBy === 'dp') cmp = a.dpAktif - b.dpAktif
    return sortDir === 'asc' ? cmp : -cmp
  }), [peronList, sortBy, sortDir])

  function SortIcon({ col }: { col: SortCol }) {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3" />
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deletePeron(id)
      toast.success('Peron berhasil dihapus')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus peron')
    } finally {
      setDeleting(null)
    }
  }

  if (peronList.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Belum ada peron"
        description="Tambahkan peron untuk mulai mencatat pembelian dari mitra."
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Desktop */}
      <div className="hidden md:block rounded-xl border border-stone-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Kode</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <button onClick={() => handleSort('nama')} className={`inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-zinc-200 transition-colors ${sortBy === 'nama' ? 'text-stone-900 dark:text-zinc-100' : ''}`}>
                  Nama <SortIcon col="nama" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Kontak</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <button onClick={() => handleSort('keuntungan')} className={`inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-zinc-200 transition-colors ${sortBy === 'keuntungan' ? 'text-stone-900 dark:text-zinc-100' : ''}`}>
                  Untung/kg <SortIcon col="keuntungan" />
                </button>
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <button onClick={() => handleSort('dp')} className={`inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-zinc-200 transition-colors ${sortBy === 'dp' ? 'text-stone-900 dark:text-zinc-100' : ''}`}>
                  DP Aktif <SortIcon col="dp" />
                </button>
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Status</th>
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sorted.map((p) => (
              <tr key={p.id} className="bg-white hover:bg-stone-50 dark:hover:bg-white/[0.03] transition-colors group">
                <td className="px-4 py-3 text-stone-500 num">{p.kode ?? <span className="text-stone-300">—</span>}</td>
                <td className="px-4 py-3 font-semibold text-stone-900 dark:text-stone-100">{p.nama}</td>
                <td className="px-4 py-3 text-stone-500">{p.kontak ?? <span className="text-stone-300">—</span>}</td>
                <td className="px-4 py-3 text-right text-stone-700 num">
                  Rp {p.keuntunganPerKg.toLocaleString('id-ID')}/kg
                </td>
                <td className="px-4 py-3 text-right font-semibold text-stone-900 dark:text-stone-100 num">
                  {formatRupiah(p.dpAktif)}
                </td>
                <td className="px-4 py-3 text-center">
                  {p.status === 'aktif' ? (
                    <StatusPill tone="ok">Aktif</StatusPill>
                  ) : (
                    <StatusPill tone="neutral" className="line-through">Nonaktif</StatusPill>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    <RowActions p={p} isOwner={isOwner} onDelete={handleDelete} deleting={deleting} akunOptions={akunOptions} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile — aksi di kebab ⋯, kartu dipadatkan jadi 2 zona */}
      <div className="md:hidden space-y-2">
        {sorted.map((p) => (
          <div key={p.id} className="surface press-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-stone-900 dark:text-stone-100">
                  {p.kode != null && <span className="text-stone-400 text-xs mr-1">#{p.kode}</span>}
                  {p.nama}
                </p>
                {p.kontak && <p className="mt-0.5 truncate text-xs text-stone-500">{p.kontak}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {p.status === 'aktif' ? (
                  <StatusPill tone="ok">Aktif</StatusPill>
                ) : (
                  <StatusPill tone="neutral">Nonaktif</StatusPill>
                )}
                <RowActions p={p} isOwner={isOwner} onDelete={handleDelete} deleting={deleting} akunOptions={akunOptions} variant="sheet" />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <span className="text-stone-500 dark:text-zinc-400">
                Untung/kg <span className="font-medium text-stone-900 dark:text-zinc-100 num">Rp {p.keuntunganPerKg.toLocaleString('id-ID')}</span>
              </span>
              <span className="text-stone-500 dark:text-zinc-400">
                DP <span className="font-semibold text-stone-900 dark:text-stone-100 num">{formatRupiah(p.dpAktif)}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
