// Skeleton detail Peron (force-dynamic): header + kartu ringkasan + riwayat modal.
// Lebih sesuai bentuk halaman detail daripada fallback skeleton daftar peron.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="space-y-5 animate-pulse">
      <span className="sr-only">Memuat…</span>
      {/* Header: judul + aksi */}
      <div className="space-y-2">
        <div className="h-6 w-48 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
        <div className="h-3 w-32 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
      </div>

      {/* Kartu ringkasan — 4 kartu (grid-cols-2 md:grid-cols-4) selaras halaman detail */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="surface h-24" />
        <div className="surface h-24" />
        <div className="surface h-24" />
        <div className="surface h-24" />
      </div>

      {/* Riwayat modal */}
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="surface h-16" />
        ))}
      </div>
    </div>
  )
}
