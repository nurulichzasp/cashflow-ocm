// Skeleton Dashboard — fallback Suspense saat navigasi / data berat.
// Mencerminkan struktur baru: sapaan → hero Total Kas → 4 aksi cepat →
// kartu akun (geser) → 2 kartu ringkasan → baris kesehatan peron → transaksi.
// Netral + util .surface + animate-pulse (selaras loading.tsx lain).
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="space-y-5 pb-2 pt-1 md:pt-0 animate-pulse">
      <span className="sr-only">Memuat…</span>
      {/* A. Sapaan */}
      <div className="px-0.5">
        <div className="h-6 w-40 rounded-lg bg-stone-200/60 dark:bg-white/[0.06]" />
        <div className="mt-2 h-3 w-32 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
      </div>

      {/* B. Hero Total Kas */}
      <div className="rounded-3xl bg-[#18181B] p-6">
        <div className="h-3 w-20 rounded bg-white/10" />
        <div className="mt-3 h-10 w-2/3 rounded-lg bg-white/[0.08]" />
        <div className="mt-4 h-3 w-40 rounded bg-white/[0.06]" />
      </div>

      {/* C. Aksi cepat */}
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="h-14 w-14 rounded-2xl bg-stone-200/60 dark:bg-white/[0.06]" />
            <div className="h-2.5 w-12 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
          </div>
        ))}
      </div>

      {/* D. Kartu akun (geser) */}
      <div>
        <div className="mb-2.5 h-2.5 w-16 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
        <div className="flex gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="surface flex h-[128px] w-[78%] shrink-0 flex-col justify-between p-5 sm:w-[260px]">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-stone-200/60 dark:bg-white/[0.06]" />
                <div className="space-y-1.5">
                  <div className="h-3 w-24 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
                  <div className="h-2 w-12 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
                </div>
              </div>
              <div className="h-6 w-1/2 rounded-lg bg-stone-200/60 dark:bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>

      {/* E. Ringkasan (2 kartu) */}
      <div>
        <div className="mb-2.5 h-2.5 w-24 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="surface p-4">
              <div className="h-2.5 w-20 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
              <div className="mt-3 h-5 w-2/3 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
              <div className="mt-2 h-2 w-16 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>

      {/* F. Kesehatan peron */}
      <div className="surface flex items-center gap-3 p-4">
        <div className="h-9 w-9 rounded-xl bg-stone-200/60 dark:bg-white/[0.06]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-32 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
          <div className="h-2 w-20 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
        </div>
      </div>

      {/* G. Transaksi terakhir */}
      <div>
        <div className="mb-2.5 h-2.5 w-28 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
        <div className="surface divide-y divide-stone-100 dark:divide-border overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-stone-200/60 dark:bg-white/[0.06]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-28 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
                <div className="h-2 w-20 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
              </div>
              <div className="h-3 w-16 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
