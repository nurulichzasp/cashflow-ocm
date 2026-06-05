'use client'

import React, { useState, useMemo } from 'react'
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
import { deleteBiayaOperasional } from './actions'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { FotoBuktiGallery } from '@/components/foto-bukti-gallery'
import { Trash2, Receipt, ImageIcon, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { BiayaOperasional, AkunKas, BiayaFoto } from '@/lib/db/schema'

type BiayaRow = BiayaOperasional & { akunSumber: AkunKas | null; fotos: BiayaFoto[] }

const kategoriLabels: Record<BiayaOperasional['kategori'], string> = {
  gaji: 'Gaji',
  solar: 'Solar',
  transport: 'Transport',
  lainnya: 'Lainnya',
}

const kategoriColors: Record<BiayaOperasional['kategori'], string> = {
  gaji: 'bg-violet-50 text-violet-700 border border-violet-200',
  solar: 'bg-amber-50 text-amber-700 border border-amber-200',
  transport: 'bg-blue-50 text-blue-700 border border-blue-200',
  lainnya: 'bg-stone-100 text-stone-600',
}

interface Props {
  biayaList: BiayaRow[]
  isOwner: boolean
}

type SortCol = 'tanggal' | 'jumlah'

export function BiayaTable({ biayaList, isOwner }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedFotoId, setExpandedFotoId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortCol>('tanggal')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(col: SortCol) {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const sorted = useMemo(() => [...biayaList].sort((a, b) => {
    const cmp = sortBy === 'tanggal' ? a.tanggal.localeCompare(b.tanggal) : a.jumlah - b.jumlah
    return sortDir === 'asc' ? cmp : -cmp
  }), [biayaList, sortBy, sortDir])

  function SortIcon({ col }: { col: SortCol }) {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3" />
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

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

  if (biayaList.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100">
            <Receipt className="h-6 w-6 text-stone-400" />
          </div>
          <p className="text-sm font-medium text-stone-700">Belum ada biaya tercatat</p>
          <p className="text-xs text-stone-400 mt-1">Tambahkan biaya operasional untuk melihat ringkasan pengeluaran.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Desktop */}
      <div className="hidden md:block rounded-xl border border-stone-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <button onClick={() => handleSort('tanggal')} className={`inline-flex items-center gap-1 hover:text-orange-600 transition-colors ${sortBy === 'tanggal' ? 'text-orange-600' : ''}`}>
                  Tanggal <SortIcon col="tanggal" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Kategori</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Sumber</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <button onClick={() => handleSort('jumlah')} className={`inline-flex items-center gap-1 hover:text-orange-600 transition-colors ${sortBy === 'jumlah' ? 'text-orange-600' : ''}`}>
                  Jumlah <SortIcon col="jumlah" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Catatan</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Foto</th>
              {isOwner && <th className="px-4 py-3 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sorted.map((item) => (
              <React.Fragment key={item.id}>
                <tr className="bg-white hover:bg-orange-50/30 transition-colors">
                  <td className="px-4 py-3 text-stone-900">{formatTanggal(item.tanggal)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${kategoriColors[item.kategori]}`}>
                      {kategoriLabels[item.kategori]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700 max-w-[130px] truncate">
                      {item.akunSumber?.nama ?? item.akunSumberId}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-stone-900 num">{formatRupiah(item.jumlah)}</td>
                  <td className="px-4 py-3 text-stone-500 max-w-[200px] truncate">{item.catatan ?? <span className="text-stone-400">—</span>}</td>
                  <td className="px-4 py-3">
                    {item.fotos.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setExpandedFotoId(expandedFotoId === item.id ? null : item.id)}
                        className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        {item.fotos.length} foto
                      </button>
                    ) : (
                      <span className="text-stone-300 text-xs">—</span>
                    )}
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus biaya?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Biaya <strong>{kategoriLabels[item.kategori]}</strong> tanggal{' '}
                              <strong>{formatTanggal(item.tanggal)}</strong> sebesar{' '}
                              <strong>{formatRupiah(item.jumlah)}</strong> akan dihapus.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id ? 'Menghapus...' : 'Hapus'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  )}
                </tr>
                {expandedFotoId === item.id && item.fotos.length > 0 && (
                  <tr className="bg-orange-50/30">
                    <td colSpan={isOwner ? 7 : 6} className="px-5 py-3">
                      <FotoBuktiGallery urls={item.fotos.map((f) => f.url)} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {sorted.map((item) => (
          <div key={item.id} className="rounded-xl border border-stone-200 bg-white shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${kategoriColors[item.kategori]}`}>
                  {kategoriLabels[item.kategori]}
                </span>
                <p className="text-xs text-stone-500 mt-1">
                  {formatTanggal(item.tanggal)} · {item.akunSumber?.nama ?? item.akunSumberId}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-stone-900 num">{formatRupiah(item.jumlah)}</p>
              {isOwner && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5">
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus biaya?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Biaya {kategoriLabels[item.kategori]} pada {formatTanggal(item.tanggal)} akan dihapus.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? 'Menghapus...' : 'Hapus'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            {item.catatan && <p className="text-xs text-stone-500 mt-2">{item.catatan}</p>}
            {item.fotos.length > 0 && (
              <div className="mt-3 pt-3 border-t border-stone-100">
                <FotoBuktiGallery urls={item.fotos.map((f) => f.url)} maxThumbnails={3} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
