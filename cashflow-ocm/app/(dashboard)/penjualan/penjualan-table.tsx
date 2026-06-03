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
import { deletePenjualan } from './actions'
import { formatTanggal } from '@/lib/format'
import { Trash2, FileText } from 'lucide-react'
import type { Penjualan } from '@/lib/db/schema'

interface Props {
  penjualanList: Penjualan[]
  isOwner: boolean
}

function StatusBadge({ status }: { status: 'lunas' | 'belum' }) {
  if (status === 'lunas') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 border border-green-200">
        Lunas
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 border border-red-200">
      Belum Lunas
    </span>
  )
}

export function PenjualanTable({ penjualanList, isOwner }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deletePenjualan(id)
      toast.success('Penjualan berhasil dihapus')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus penjualan')
    } finally {
      setDeletingId(null)
    }
  }

  if (penjualanList.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100">
            <FileText className="h-6 w-6 text-stone-400" />
          </div>
          <p className="text-sm font-medium text-stone-700">Belum ada data penjualan</p>
          <p className="text-xs text-stone-400 mt-1">Tambahkan transaksi untuk memantau piutang dan invoice.</p>
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
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Tanggal</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">No. Invoice</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">No. BAST</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Tgl Bayar BGA</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Catatan</th>
              {isOwner && <th className="px-4 py-3 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {penjualanList.map((item) => (
              <tr key={item.id} className="bg-white hover:bg-orange-50/30 transition-colors">
                <td className="px-4 py-3 text-stone-900">{formatTanggal(item.tanggal)}</td>
                <td className="px-4 py-3 font-medium text-stone-900">{item.noInvoice || <span className="text-stone-400">—</span>}</td>
                <td className="px-4 py-3 text-stone-600">{item.noBast || <span className="text-stone-400">—</span>}</td>
                <td className="px-4 py-3"><StatusBadge status={item.statusBayar} /></td>
                <td className="px-4 py-3 text-stone-600">{item.tanggalBayarBga ? formatTanggal(item.tanggalBayarBga) : <span className="text-stone-400">—</span>}</td>
                <td className="px-4 py-3 text-stone-500 max-w-[180px] truncate">{item.catatan ?? <span className="text-stone-400">—</span>}</td>
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
                          <AlertDialogTitle>Hapus penjualan?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Invoice <strong>{item.noInvoice || 'tanpa nomor'}</strong> akan dihapus secara permanen.
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {penjualanList.map((item) => (
          <div key={item.id} className="rounded-xl border border-stone-200 bg-white shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="font-semibold text-stone-900">{item.noInvoice || 'Tanpa nomor invoice'}</p>
                <p className="text-xs text-stone-500 mt-0.5">{formatTanggal(item.tanggal)}</p>
              </div>
              <StatusBadge status={item.statusBayar} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-stone-400 mb-0.5">Tgl Bayar BGA</p>
                <p className="text-stone-700">{item.tanggalBayarBga ? formatTanggal(item.tanggalBayarBga) : '—'}</p>
              </div>
              {item.catatan && (
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Catatan</p>
                  <p className="text-stone-700">{item.catatan}</p>
                </div>
              )}
            </div>
            {isOwner && (
              <div className="flex justify-end mt-3 pt-3 border-t border-stone-100">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5">
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus penjualan?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Invoice {item.noInvoice || 'tanpa nomor'} akan dihapus.
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
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
