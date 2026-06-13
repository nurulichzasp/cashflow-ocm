'use client'

import React, { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/status-pill'
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
import { deleteBiayaOperasional } from './actions'
import { BiayaFormDialog } from './biaya-form-dialog'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { FotoBuktiGallery } from '@/components/foto-bukti-gallery'
import { Trash2, Receipt, ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, Pencil } from 'lucide-react'
import { DateRangeFilter } from '@/components/date-range-filter'
import type { BiayaOperasional, AkunKas, BiayaFoto } from '@/lib/db/schema'

type BiayaRow = BiayaOperasional & { akunSumber: AkunKas | null; fotos: BiayaFoto[] }

const kategoriLabels: Record<BiayaOperasional['kategori'], string> = {
  gaji: 'Gaji',
  solar: 'Solar',
  transport: 'Transport',
  lainnya: 'Lainnya',
}

type AkunOption = { id: string; nama: string; tipe: string }

interface Props {
  biayaList: BiayaRow[]
  isOwner: boolean
  akunOptions: AkunOption[]
}

type SortCol = 'tanggal' | 'jumlah'

export function BiayaTable({ biayaList, isOwner, akunOptions }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedFotoId, setExpandedFotoId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortCol>('tanggal')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')

  function handleSort(col: SortCol) {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const sorted = useMemo(() => {
    let list = [...biayaList]
    if (dari) list = list.filter(b => b.tanggal >= dari)
    if (sampai) list = list.filter(b => b.tanggal <= sampai)
    list.sort((a, b) => {
      const cmp = sortBy === 'tanggal' ? a.tanggal.localeCompare(b.tanggal) : a.jumlah - b.jumlah
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [biayaList, sortBy, sortDir, dari, sampai])

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
      <EmptyState
        icon={Receipt}
        title="Belum ada biaya tercatat"
        description="Tambahkan biaya operasional untuk melihat ringkasan pengeluaran."
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
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <button type="button" onClick={() => handleSort('tanggal')} className={`inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-zinc-200 transition-colors ${sortBy === 'tanggal' ? 'text-stone-900 dark:text-zinc-100' : ''}`}>
                  Tanggal <SortIcon col="tanggal" />
                </button>
              </th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Kategori</th>
              <th scope="col" className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Sumber</th>
              <th scope="col" className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <button type="button" onClick={() => handleSort('jumlah')} className={`inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-zinc-200 transition-colors ${sortBy === 'jumlah' ? 'text-stone-900 dark:text-zinc-100' : ''}`}>
                  Jumlah <SortIcon col="jumlah" />
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
                <tr className="bg-white hover:bg-stone-50 dark:hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 text-stone-900 dark:text-stone-100">{formatTanggal(item.tanggal)}</td>
                  <td className="px-4 py-3">
                    <StatusPill tone="neutral">{kategoriLabels[item.kategori]}</StatusPill>
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
                        className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300 font-medium"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        {item.fotos.length} foto
                      </button>
                    ) : (
                      <span className="text-stone-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-0.5">
                      <BiayaFormDialog editItem={item} akunOptions={akunOptions}>
                        <Button variant="ghost" size="icon" aria-label="Edit" className="tap-pad h-8 w-8 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </BiayaFormDialog>
                      {isOwner && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Hapus" className="tap-pad h-8 w-8 text-stone-400 hover:text-red-600 hover:bg-red-50">
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
                      )}
                    </div>
                  </td>
                </tr>
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

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {sorted.map((item) => (
          <div key={item.id} className="surface p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <StatusPill tone="neutral">{kategoriLabels[item.kategori]}</StatusPill>
                <p className="text-xs text-stone-500 mt-1">
                  {formatTanggal(item.tanggal)} · {item.akunSumber?.nama ?? item.akunSumberId}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-stone-900 num">{formatRupiah(item.jumlah)}</p>
              <div className="flex items-center gap-1">
                <BiayaFormDialog editItem={item} akunOptions={akunOptions}>
                  <Button variant="ghost" size="sm" className="text-stone-600 dark:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </BiayaFormDialog>
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
