// Skeleton untuk Profil (force-dynamic, full-screen).
// Bentuk: header + avatar + baris info — bukan skeleton daftar generik.
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="space-y-5 animate-pulse">
      <span className="sr-only">Memuat…</span>
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-stone-200/60 dark:bg-white/[0.06]" />
        <div className="h-5 w-32 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
      </div>

      {/* Kartu identitas: avatar + nama */}
      <div className="surface flex items-center gap-4 p-5">
        <div className="h-16 w-16 rounded-full bg-stone-200/60 dark:bg-white/[0.06]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
          <div className="h-3 w-28 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
        </div>
      </div>

      {/* Baris menu */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface h-14" />
        ))}
      </div>
    </div>
  )
}
