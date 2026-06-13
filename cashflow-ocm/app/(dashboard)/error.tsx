'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Error boundary untuk seluruh route dashboard. Kalau server component gagal
 * (DB timeout, sinyal jelek di lapangan), user dapat layar ramah + "Coba Lagi"
 * — bukan layar error mentah Next.js. reset() me-render ulang segmen.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard error boundary]', error)
  }, [error])

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
      <div className="surface flex max-w-sm flex-col items-center gap-4 p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 dark:bg-white/[0.06]">
          <AlertCircle className="h-6 w-6 text-stone-400 dark:text-zinc-500" strokeWidth={1.75} />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-stone-900 dark:text-zinc-100">Terjadi kesalahan</p>
          <p className="text-sm text-stone-500 dark:text-zinc-400 max-w-[32ch] leading-relaxed">
            Data gagal dimuat. Periksa koneksi internet lalu coba lagi.
          </p>
        </div>
        <Button onClick={reset} className="mt-1">Coba Lagi</Button>
      </div>
    </div>
  )
}
