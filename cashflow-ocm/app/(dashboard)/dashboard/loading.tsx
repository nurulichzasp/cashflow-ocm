// Skeleton loading khusus Dashboard — fallback Suspense saat navigasi / data berat.
// Mencerminkan struktur asli: hero Modal Berputar (angka besar + sparkline lebar),
// today strip 3 kolom, glance margin/harga, daftar saldo akun + pajak, lalu chart band.
// Netral + util .surface + animate-pulse, selaras sistem desain (lihat loading.tsx lain).
export default function Loading() {
  return (
    <div className="space-y-4 sm:space-y-5 pt-1 md:pt-0 animate-pulse" aria-hidden="true">
      {/* HERO + TODAY */}
      <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
        {/* Modal Hero — angka besar + sparkline lebar + breakdown chip */}
        <div className="lg:col-span-2 surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="h-3 w-40 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
            <div className="h-3 w-12 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
          </div>
          {/* Angka utama besar */}
          <div className="mt-3 h-9 w-2/3 rounded-lg bg-stone-200/60 dark:bg-white/[0.06]" />
          {/* Sparkline lebar */}
          <div className="mt-4 h-14 sm:h-16 w-full rounded-lg bg-stone-200/40 dark:bg-white/[0.04]" />
          {/* Breakdown chip */}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 pt-4 border-t border-stone-100 dark:border-white/[0.06]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-3 w-20 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
            ))}
          </div>
        </div>

        {/* Today strip — 3 kolom (sempit) / kolom vertikal (lg) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:flex lg:flex-col lg:gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-stone-50/60 dark:bg-white/[0.025] px-3 py-3 sm:px-4 sm:py-3.5 lg:flex-1"
            >
              <div className="h-2.5 w-16 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
              <div className="mt-2 h-4 w-12 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>

      {/* GLANCE — Margin Dagang + Harga Lapangan */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
        <div className="surface p-5 sm:p-6">
          <div className="h-3 w-28 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
          <div className="mt-3 h-10 w-24 rounded-lg bg-stone-200/60 dark:bg-white/[0.06]" />
          <div className="mt-5 h-1.5 w-full rounded-full bg-stone-200/40 dark:bg-white/[0.04]" />
        </div>
        <div className="surface p-5 sm:p-6">
          <div className="h-3 w-28 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-2.5 w-16 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
                <div className="h-4 w-20 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TWO-UP — Saldo akun (list) + Pajak */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 surface overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-100 dark:border-border flex items-center justify-between">
            <div className="h-3 w-36 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
            <div className="h-3 w-16 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
          </div>
          <div className="divide-y divide-stone-100 dark:divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="h-3.5 w-1/3 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
                <div className="h-3.5 w-20 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </div>

        <div className="surface overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-100 dark:border-border flex items-center justify-between">
            <div className="h-3 w-12 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
            <div className="h-2.5 w-20 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
          </div>
          <div className="divide-y divide-stone-100 dark:divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="space-y-1.5">
                  <div className="h-2.5 w-20 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
                  <div className="h-2 w-16 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
                </div>
                <div className="h-3 w-16 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CHART — cashflow harian */}
      <div className="surface overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-100 dark:border-border space-y-2">
          <div className="h-3.5 w-32 rounded bg-stone-200/60 dark:bg-white/[0.06]" />
          <div className="h-2.5 w-48 rounded bg-stone-200/40 dark:bg-white/[0.04]" />
        </div>
        <div className="p-4">
          <div className="h-48 sm:h-56 w-full rounded-lg bg-stone-200/40 dark:bg-white/[0.04]" />
        </div>
      </div>
    </div>
  )
}
