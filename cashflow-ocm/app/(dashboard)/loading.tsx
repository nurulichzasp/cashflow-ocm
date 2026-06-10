// Skeleton loading iOS untuk semua halaman dashboard (fallback Suspense saat navigasi).
// Penting di sinyal jelek (admin lapangan): pindah halaman tak "membeku" tanpa feedback.
// Shimmer halus ala iOS via util .skeleton — hormati prefers-reduced-motion.
export default function Loading() {
  return (
    <div className="space-y-5" aria-hidden="true">
      {/* Ringkasan: dua kartu berdampingan */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="skeleton h-24 rounded-xl sm:h-28" />
        <div className="skeleton h-24 rounded-xl sm:h-28" />
      </div>

      {/* Hero / chart band */}
      <div className="skeleton h-36 rounded-xl" />

      {/* Daftar baris */}
      <div className="space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="surface flex items-center gap-3 p-4">
            <div className="skeleton h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-1/3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
            <div className="skeleton h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
