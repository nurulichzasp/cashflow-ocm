import { cn } from '@/lib/utils'

/** Kotak skeleton dasar — abu redup, selaras sistem. */
function Box({ className }: { className?: string }) {
  return <div className={cn('rounded bg-stone-200/60 dark:bg-white/[0.06]', className)} />
}

/**
 * Skeleton halaman daftar (pembelian/penjualan/kas/biaya/peron/harga):
 * kartu ringkasan + bar filter + baris kartu. `stats` = jumlah kartu ringkasan.
 */
export function ListPageSkeleton({ stats = 4 }: { stats?: number }) {
  return (
    <div role="status" aria-busy="true" className="space-y-5 animate-pulse">
      <span className="sr-only">Memuat…</span>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {Array.from({ length: stats }).map((_, i) => (
          <div key={i} className="surface p-4">
            <Box className="h-3 w-1/2" />
            <Box className="mt-3 h-5 w-2/3" />
          </div>
        ))}
      </div>

      {/* Bar filter */}
      <div className="flex gap-2">
        <Box className="h-10 flex-1 rounded-lg" />
        <Box className="h-10 w-28 rounded-lg" />
      </div>

      {/* Baris kartu */}
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="surface space-y-3 p-4">
            <div className="flex items-center justify-between">
              <Box className="h-4 w-24" />
              <Box className="h-4 w-16" />
            </div>
            <Box className="h-6 w-1/2" />
            <div className="flex gap-4">
              <Box className="h-3 w-16" />
              <Box className="h-3 w-16" />
              <Box className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Skeleton laporan: header + tabel ringkas. */
export function ReportSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-5 animate-pulse">
      <span className="sr-only">Memuat…</span>
      <div className="flex gap-2">
        <Box className="h-10 w-40 rounded-lg" />
        <Box className="h-10 w-28 rounded-lg" />
      </div>
      <div className="surface space-y-3 p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Box className="h-4 w-40" />
            <Box className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
