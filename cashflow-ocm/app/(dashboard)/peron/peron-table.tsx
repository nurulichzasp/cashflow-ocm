'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { deletePeron } from './actions'
import { Edit, Trash2, Wallet, Users, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { Peron } from '@/lib/db/schema'

type PeronWithDp = Peron & { dpAktif: number }

interface Props {
  peronList: PeronWithDp[]
  isOwner: boolean
}

type SortCol = 'nama' | 'keuntungan' | 'dp'

export function PeronTable({ peronList, isOwner }: Props) {
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
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100">
            <Users className="h-6 w-6 text-stone-400" />
          </div>
          <p className="text-sm font-medium text-stone-700">Belum ada data peron</p>
          <p className="text-xs text-stone-400 mt-1">Tambahkan peron untuk mulai mencatat pembelian dari mitra.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Desktop */}
      <div className="hidden md:block rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Kode</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <button onClick={() => handleSort('nama')} className={`inline-flex items-center gap-1 hover:text-orange-600 transition-colors ${sortBy === 'nama' ? 'text-orange-600' : ''}`}>
                  Nama <SortIcon col="nama" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Kontak</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <button onClick={() => handleSort('keuntungan')} className={`inline-flex items-center gap-1 hover:text-orange-600 transition-colors ${sortBy === 'keuntungan' ? 'text-orange-600' : ''}`}>
                  Untung/kg <SortIcon col="keuntungan" />
                </button>
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <button onClick={() => handleSort('dp')} className={`inline-flex items-center gap-1 hover:text-orange-600 transition-colors ${sortBy === 'dp' ? 'text-orange-600' : ''}`}>
                  DP Aktif <SortIcon col="dp" />
                </button>
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Status</th>
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sorted.map((p) => (
              <tr key={p.id} className="bg-white hover:bg-orange-50/30 transition-colors group">
                <td className="px-4 py-3 text-stone-500 num">{p.kode ?? <span className="text-stone-300">—</span>}</td>
                <td className="px-4 py-3 font-semibold text-stone-900">{p.nama}</td>
                <td className="px-4 py-3 text-stone-500">{p.kontak ?? <span className="text-stone-300">—</span>}</td>
                <td className="px-4 py-3 text-right text-stone-700 num">
                  Rp {p.keuntunganPerKg.toLocaleString('id-ID')}/kg
                </td>
                <td className="px-4 py-3 text-right font-semibold text-orange-600 num">
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
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ModalFormDialog peronId={p.id} peronNama={p.nama}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 hover:text-orange-600 hover:bg-orange-50" title="Kelola Modal/DP">
                        <Wallet className="h-3.5 w-3.5" />
                      </Button>
                    </ModalFormDialog>
                    <PeronFormDialog mode="edit" peron={p}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 hover:text-stone-900 hover:bg-stone-100" title="Edit">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </PeronFormDialog>
                    {isOwner && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-red-600 hover:bg-red-50" title="Hapus">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
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
                              onClick={() => handleDelete(p.id)}
                              disabled={deleting === p.id}
                            >
                              {deleting === p.id ? 'Menghapus...' : 'Ya, Hapus'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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
          <div key={p.id} className="rounded-xl border border-stone-200 bg-white shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="font-semibold text-stone-900">
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
                <p className="font-semibold text-orange-600 num">{formatRupiah(p.dpAktif)}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-stone-100">
              <ModalFormDialog peronId={p.id} peronNama={p.nama}>
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
