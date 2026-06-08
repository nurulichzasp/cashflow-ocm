'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/empty-state'
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
import { formatRupiah } from '@/lib/format'
import { PeronFormDialog } from './peron-form-dialog'
import { ModalFormDialog } from './modal-form-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deletePeron } from './actions'
import { Edit, Trash2, Wallet, Users, ArrowUpDown, ArrowUp, ArrowDown, MoreVertical } from 'lucide-react'
import type { Peron } from '@/lib/db/schema'

type PeronRow = Peron & { dpAktif: number }

function RowActions({ p, isOwner, onDelete, deleting, akunOptions = [] }: { p: PeronRow; isOwner: boolean; onDelete: (id: string) => void; deleting: string | null; akunOptions?: AkunOption[] }) {
  const [editOpen, setEditOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition-colors outline-none aria-expanded:bg-stone-100 dark:aria-expanded:bg-white/[0.06]"
          aria-label="Aksi"
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          <DropdownMenuItem onClick={() => setModalOpen(true)}>
            <Wallet className="h-4 w-4" /> Kelola DP/Modal
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4" /> Edit
          </DropdownMenuItem>
          {isOwner && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Hapus
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {modalOpen && <ModalFormDialog peronId={p.id} peronNama={p.nama} akunOptions={akunOptions} open={modalOpen} onOpenChange={setModalOpen} />}
      {editOpen && <PeronFormDialog mode="edit" peron={p} open={editOpen} onOpenChange={setEditOpen} />}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Peron?</AlertDialogTitle>
            <AlertDialogDescription>
              Data peron <strong>{p.nama}</strong> beserta seluruh riwayat modal akan dihapus permanen. Aksi ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => onDelete(p.id)}
              disabled={deleting === p.id}
            >
              {deleting === p.id ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
                    <span className="inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 border border-green-200">Aktif</span>
                  ) : (
                    <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-400 line-through">Nonaktif</span>
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

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {sorted.map((p) => (
          <div key={p.id} className="surface press-card p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="font-semibold text-stone-900 dark:text-stone-100">
                  {p.kode != null && <span className="text-stone-400 text-xs mr-1">#{p.kode}</span>}
                  {p.nama}
                </p>
                {p.kontak && <p className="text-xs text-stone-500 mt-0.5">{p.kontak}</p>}
              </div>
              {p.status === 'aktif' ? (
                <span className="inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 border border-green-200 shrink-0">Aktif</span>
              ) : (
                <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-400 shrink-0">Nonaktif</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <p className="text-xs text-stone-400 mb-0.5">Untung/kg</p>
                <p className="font-medium text-stone-900 num">Rp {p.keuntunganPerKg.toLocaleString('id-ID')}/kg</p>
              </div>
              <div>
                <p className="text-xs text-stone-400 mb-0.5">DP Aktif</p>
                <p className="font-semibold text-stone-900 dark:text-stone-100 num">{formatRupiah(p.dpAktif)}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-stone-100">
              <ModalFormDialog peronId={p.id} peronNama={p.nama} akunOptions={akunOptions}>
                <Button variant="outline" size="sm" className="flex-1 gap-2 border-stone-200 text-stone-700 hover:bg-stone-50">
                  <Wallet className="h-3.5 w-3.5" />
                  Kelola DP
                </Button>
              </ModalFormDialog>
              <PeronFormDialog mode="edit" peron={p}>
                <Button variant="outline" size="sm" className="gap-2 border-stone-200 text-stone-700 hover:bg-stone-50">
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </PeronFormDialog>
              {isOwner && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus Peron?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Data <strong>{p.nama}</strong> akan dihapus permanen.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleDelete(p.id)}
                        disabled={deleting === p.id}
                      >
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
