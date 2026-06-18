import { WifiOff } from 'lucide-react'
import { OfflineRetryButton } from './offline-retry'

export const metadata = { title: 'Offline — CV OCM' }

/** Fallback saat navigasi gagal tanpa koneksi (disajikan service worker). */
export default function OfflinePage() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-6 overflow-hidden bg-[var(--brand-screen-bg)] px-6 text-center text-zinc-100">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.04]">
        <WifiOff className="h-6 w-6 text-[var(--brand-screen-warn)]" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-zinc-50">Sedang offline</h1>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-zinc-400">
          Tidak ada koneksi internet. Periksa sinyal lalu coba lagi — data terbaru
          muncul saat kembali online.
        </p>
      </div>
      <OfflineRetryButton />
    </main>
  )
}
