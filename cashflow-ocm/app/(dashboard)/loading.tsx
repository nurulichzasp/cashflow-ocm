// Skeleton loading untuk semua halaman dashboard (fallback Suspense saat navigasi).
// Penting di sinyal jelek (admin lapangan): pindah halaman tak "membeku" tanpa feedback.
// Netral + util .surface + animate-pulse, selaras sistem desain.
export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse" aria-hidden="true">
      {/* Ringkasan: dua kartu berdampingan */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="surface h-24 sm:h-28" />
        <div className="surface h-24 sm:h-28" />
      </div>

      {/* Hero / chart band */}
      <div className="surface h-36" />

      {/* Daftar baris */}
      <div className="space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="surface flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-lg bg-stone-200/60 dark:bg-white/[0.06]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
              <div className="h-3 w-1/2 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
            </div>
            <div className="h-4 w-16 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  )
}
