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
import { deleteTransaksiKas } from './actions'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { Trash2, Wallet, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { DateRangeFilter } from '@/components/date-range-filter'
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
  isOwner: boolean
}

type SortCol = 'tanggal' | 'jumlah'

export function KasTable({ transaksiList, isOwner }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [sortBy, setSortBy] = useState<SortCol>('tanggal')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(col: SortCol) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let list = [...transaksiList]
    if (dari) list = list.filter(t => t.tanggal >= dari)
    if (sampai) list = list.filter(t => t.tanggal <= sampai)
    list.sort((a, b) => {
      if (sortBy === 'tanggal') { const c = a.tanggal.localeCompare(b.tanggal); return sortDir === 'asc' ? c : -c }
      return sortDir === 'asc' ? a.jumlah - b.jumlah : b.jumlah - a.jumlah
    })
    return list
  }, [transaksiList, dari, sampai, sortBy, sortDir])

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
      <EmptyState
        icon={Wallet}
        title="Belum ada transaksi kas"
        description="Tambahkan transaksi untuk mulai mencatat arus kas."
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
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 cursor-pointer select-none" onClick={() => handleSort('tanggal')}>
                <span className="inline-flex items-center gap-1">Tanggal {sortBy === 'tanggal' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</span>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Akun</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Kategori</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Arah</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 cursor-pointer select-none" onClick={() => handleSort('jumlah')}>
                <span className="inline-flex items-center gap-1 justify-end">Jumlah {sortBy === 'jumlah' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</span>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Catatan</th>
              {isOwner && <th className="px-4 py-3 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map((item) => (
              <tr key={item.id} className="bg-white hover:bg-stone-50 dark:hover:bg-white/[0.03] transition-colors">
                <td className="px-4 py-3 text-stone-900">{formatTanggal(item.tanggal)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700 max-w-[120px] truncate">
                    {item.akun?.nama ?? item.akunId}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-700">{kategoriLabels[item.kategori]}</td>
                <td className="px-4 py-3">
                  {item.arah === 'masuk' ? (
                    <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground border border-border">Masuk</span>
                  ) : (
                    <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-border">Keluar</span>
                  )}
                </td>
                <td className={`px-4 py-3 text-right font-semibold num ${item.arah === 'masuk' ? 'text-stone-900 dark:text-zinc-50' : 'text-stone-500 dark:text-zinc-400'}`}>
                  {item.arah === 'masuk' ? '+' : '-'}{formatRupiah(item.jumlah)}
                </td>
                <td className="px-4 py-3 text-stone-500 max-w-[180px] truncate">{item.catatan ?? <span className="text-stone-400">—</span>}</td>
                {isOwner && (
                  <td className="px-4 py-3 text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-[#F87171] hover:bg-red-50">
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
        {filtered.map((item) => (
          <div key={item.id} className="rounded-xl border border-stone-200 bg-white shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-medium text-stone-900">{kategoriLabels[item.kategori]}</p>
                <p className="text-xs text-stone-500 mt-0.5">{formatTanggal(item.tanggal)} · {item.akun?.nama ?? item.akunId}</p>
              </div>
              {item.arah === 'masuk' ? (
                <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground border border-border shrink-0">Masuk</span>
              ) : (
                <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border shrink-0">Keluar</span>
              )}
            </div>
            <p className={`text-base font-bold num ${item.arah === 'masuk' ? 'text-stone-900 dark:text-zinc-50' : 'text-stone-500 dark:text-zinc-400'}`}>
              {item.arah === 'masuk' ? '+' : '-'}{formatRupiah(item.jumlah)}
            </p>
            {item.catatan && <p className="text-xs text-stone-500 mt-2">{item.catatan}</p>}
            {isOwner && (
              <div className="flex justify-end mt-2 pt-2 border-t border-stone-100">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-[#F87171] hover:text-red-700 hover:bg-red-50 gap-1.5">
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
