// Skeleton detail Kesehatan Peron (force-dynamic): header + chart band + riwayat.
// Sebelumnya memakai fallback skeleton daftar yang tak menyerupai layout detail.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="space-y-5 animate-pulse">
      <span className="sr-only">Memuat…</span>
      <div className="space-y-2">
        <div className="h-6 w-48 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
        <div className="h-3 w-36 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
      </div>

      {/* Chart band */}
      <div className="surface h-48" />

      {/* Riwayat tindak lanjut */}
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface h-16" />
        ))}
      </div>
    </div>
  )
}
