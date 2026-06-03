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
import { deleteTransaksiKas } from './actions'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { Trash2, Wallet } from 'lucide-react'
import type { TransaksiKas, AkunKas } from '@/lib/db/schema'

type TransaksiRow = TransaksiKas & { akun: AkunKas | null }

const kategoriLabels: Record<TransaksiKas['kategori'], string> = {
  penerimaan_bga: 'Penerimaan BGA',
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
  isOwner: boolean
}

export function KasTable({ transaksiList, isOwner }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  if (transaksiList.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100">
            <Wallet className="h-6 w-6 text-stone-400" />
          </div>
          <p className="text-sm font-medium text-stone-700">Belum ada transaksi kas</p>
          <p className="text-xs text-stone-400 mt-1">Tambahkan transaksi untuk mulai mencatat arus kas.</p>
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
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Akun</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Kategori</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Arah</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Jumlah</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Catatan</th>
              {isOwner && <th className="px-4 py-3 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {transaksiList.map((item) => (
              <tr key={item.id} className="bg-white hover:bg-orange-50/30 transition-colors">
                <td className="px-4 py-3 text-stone-900">{formatTanggal(item.tanggal)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700 max-w-[120px] truncate">
                    {item.akun?.nama ?? item.akunId}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-700">{kategoriLabels[item.kategori]}</td>
                <td className="px-4 py-3">
                  {item.arah === 'masuk' ? (
                    <span className="inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 border border-green-200">Masuk</span>
                  ) : (
                    <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 border border-red-200">Keluar</span>
                  )}
                </td>
                <td className={`px-4 py-3 text-right font-semibold num ${item.arah === 'masuk' ? 'text-green-600' : 'text-red-600'}`}>
                  {item.arah === 'masuk' ? '+' : '-'}{formatRupiah(item.jumlah)}
                </td>
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
                          <AlertDialogTitle>Hapus transaksi?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Transaksi <strong>{formatTanggal(item.tanggal)}</strong> sebesar{' '}
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {transaksiList.map((item) => (
          <div key={item.id} className="rounded-xl border border-stone-200 bg-white shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-medium text-stone-900">{kategoriLabels[item.kategori]}</p>
                <p className="text-xs text-stone-500 mt-0.5">{formatTanggal(item.tanggal)} · {item.akun?.nama ?? item.akunId}</p>
              </div>
              {item.arah === 'masuk' ? (
                <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-200 shrink-0">Masuk</span>
              ) : (
                <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 border border-red-200 shrink-0">Keluar</span>
              )}
            </div>
            <p className={`text-base font-bold num ${item.arah === 'masuk' ? 'text-green-600' : 'text-red-600'}`}>
              {item.arah === 'masuk' ? '+' : '-'}{formatRupiah(item.jumlah)}
            </p>
            {item.catatan && <p className="text-xs text-stone-500 mt-2">{item.catatan}</p>}
            {isOwner && (
              <div className="flex justify-end mt-2 pt-2 border-t border-stone-100">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5">
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus transaksi?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Transaksi {kategoriLabels[item.kategori]} pada {formatTanggal(item.tanggal)} akan dihapus.
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
