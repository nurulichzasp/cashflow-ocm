'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Bar paginasi bersama untuk list transaksi (Pembelian/Penjualan/Kas/Biaya):
// caption "Menampilkan X dari Y" + tombol "Muat lebih banyak" bila masih ada
// baris di luar window. Saat filter tanggal aktif, list sudah lengkap untuk
// rentang itu → hasMore=false dan hanya caption yang tampil.
export function LoadMoreBar({
  shown,
  total,
  hasMore,
  loading,
  onLoadMore,
  unit,
}: {
  shown: number
  total: number
  hasMore: boolean
  loading?: boolean
  onLoadMore: () => void
  unit: string
}) {
  if (total <= 0) return null
  return (
    <div className="flex flex-col items-center gap-2 pt-1 pb-2">
      <p className="text-[11px] text-stone-400 dark:text-zinc-500 num tabular-nums">
        Menampilkan {shown.toLocaleString('id-ID')} dari {total.toLocaleString('id-ID')} {unit}
      </p>
      {hasMore && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLoadMore}
          disabled={loading}
          className="min-w-40"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Memuat…
            </>
          ) : (
            'Muat lebih banyak'
          )}
        </Button>
      )}
    </div>
  )
}
