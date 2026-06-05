'use client'

import { useState } from 'react'
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
import { deleteHargaAcuan } from './actions'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { Trash2, DollarSign } from 'lucide-react'
import type { HargaAcuan } from '@/lib/db/schema'

interface Props {
  hargaList: HargaAcuan[]
  isOwner: boolean
}

export function HargaTable({ hargaList, isOwner }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteHargaAcuan(id)
      toast.success('Harga acuan berhasil dihapus')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus harga acuan')
    } finally {
      setDeletingId(null)
    }
  }

  if (hargaList.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100">
            <DollarSign className="h-6 w-6 text-stone-400" />
          </div>
          <p className="text-sm font-medium text-stone-700">Belum ada harga acuan</p>
          <p className="text-xs text-stone-400 mt-1">Tambahkan harga lapangan setiap kali harga berubah.</p>
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
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Tgl Berlaku</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Produk</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Harga Lapangan</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Selisih BGA</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Harga Jual</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Catatan</th>
              {isOwner && <th className="px-4 py-3 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {hargaList.map((harga) => {
              const hargaJual = harga.hargaLapangan + harga.selisihJualBga
              return (
                <tr key={harga.id} className="bg-white hover:bg-orange-50/30 transition-colors">
                  <td className="px-4 py-3 text-stone-900">{formatTanggal(harga.tanggalBerlaku)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${harga.produk === 'TBS' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {harga.produk}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700 num">{formatRupiah(harga.hargaLapangan)}/kg</td>
                  <td className="px-4 py-3 text-right text-stone-700 num">{formatRupiah(harga.selisihJualBga)}/kg</td>
                  <td className="px-4 py-3 text-right font-semibold text-stone-900 num">{formatRupiah(hargaJual)}/kg</td>
                  <td className="px-4 py-3 text-stone-500 max-w-[180px] truncate">{harga.catatan ?? <span className="text-stone-400">—</span>}</td>
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
                            <AlertDialogTitle>Hapus Harga Acuan?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Harga acuan <strong>{harga.produk}</strong> tanggal{' '}
                              <strong>{formatTanggal(harga.tanggalBerlaku)}</strong> akan dihapus permanen.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => handleDelete(harga.id)}
                              disabled={deletingId === harga.id}
                            >
                              {deletingId === harga.id ? 'Menghapus...' : 'Hapus'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {hargaList.map((harga) => {
          const hargaJual = harga.hargaLapangan + harga.selisihJualBga
          return (
            <div key={harga.id} className="rounded-xl border border-stone-200 bg-white shadow-sm p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${harga.produk === 'TBS' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    {harga.produk}
                  </span>
                  <p className="text-xs text-stone-500 mt-1">{formatTanggal(harga.tanggalBerlaku)}</p>
                </div>
                {isOwner && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Harga Acuan?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Harga {harga.produk} pada {formatTanggal(harga.tanggalBerlaku)} akan dihapus.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => handleDelete(harga.id)}
                          disabled={deletingId === harga.id}
                        >
                          {deletingId === harga.id ? 'Menghapus...' : 'Hapus'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Harga Lapangan</p>
                  <p className="font-medium text-stone-900 num">{formatRupiah(harga.hargaLapangan)}/kg</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Selisih BGA</p>
                  <p className="font-medium text-stone-900 num">{formatRupiah(harga.selisihJualBga)}/kg</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Harga Jual</p>
                  <p className="font-semibold text-stone-900 num">{formatRupiah(hargaJual)}/kg</p>
                </div>
              </div>
              {harga.catatan && <p className="text-xs text-stone-500 mt-2">{harga.catatan}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
