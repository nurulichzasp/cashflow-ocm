// Skeleton untuk Pengaturan & seluruh sub-halamannya (force-dynamic).
// Bentuk: header (back + judul) + baris kartu pengaturan — selaras layout asli,
// bukan skeleton daftar generik.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="space-y-5 animate-pulse">
      <span className="sr-only">Memuat…</span>
      {/* Header: tombol back + judul */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-stone-200/60 dark:bg-white/[0.06]" />
        <div className="h-5 w-40 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
      </div>

      {/* Baris kartu pengaturan */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="surface flex items-center justify-between gap-3 p-4">
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
              <div className="h-3 w-48 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
            </div>
            {/* Chevron (list IG-style), bukan toggle — selaras halaman index */}
            <div className="h-4 w-4 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  )
}
