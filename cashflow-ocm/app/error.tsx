'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { reportClientError } from '@/lib/report-client-error'

/**
 * Error boundary ROOT — menangkap kegagalan di rute luar dashboard (login, portal
 * publik, dll) agar tak jatuh ke layar error mentah Next.js. Layar imersif gelap
 * (theme-independent) + tombol Coba Lagi. reset() me-render ulang segmen.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[root error boundary]', error)
    reportClientError(error)
  }, [error])

  return (
    <main
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-[var(--brand-screen-bg)] px-6 text-center text-zinc-100"
      style={{ colorScheme: 'dark' }}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.04]">
        <AlertCircle className="h-6 w-6 text-[var(--brand-screen-warn)]" strokeWidth={1.75} />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-zinc-50">Terjadi kesalahan</h1>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-zinc-400">
          Halaman gagal dimuat. Periksa koneksi internet lalu coba lagi.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--brand-solid)] px-6 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(14,122,87,0.4)] transition-all hover:brightness-110 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-screen-bg)]"
      >
        Coba Lagi
      </button>
    </main>
  )
}
