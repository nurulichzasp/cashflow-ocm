'use client'

// Lazy-load CashflowChart agar recharts (library chart yang besar) TIDAK ikut
// bundle awal halaman Dashboard (halaman utama / start_url PWA). Chart dimuat
// setelah hidrasi dengan skeleton setinggi chart asli (h-56) → tanpa layout shift.
import dynamic from 'next/dynamic'

const CashflowChart = dynamic(() => import('./CashflowChart'), {
  ssr: false,
  loading: () => (
    <div className="h-56 w-full animate-pulse rounded-lg bg-stone-100 dark:bg-white/[0.04]" />
  ),
})

export default CashflowChart
