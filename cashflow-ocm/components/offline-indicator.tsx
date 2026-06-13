'use client'

import { useEffect, useRef } from 'react'
import { useOffline } from '@/hooks/use-offline'
import { WifiOff } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Banner offline + auto-toast saat kembali online. Memanggil useOffline() yang
 * sekaligus me-register service worker. Level 2: TIDAK ada queue tulisan offline,
 * jadi pesannya jujur — cuma menunggu sinyal, tanpa klaim "sinkron otomatis".
 */
export function OfflineIndicator() {
  const { isOffline } = useOffline()
  const wasOffline = useRef(false)

  useEffect(() => {
    if (isOffline) {
      wasOffline.current = true
    } else if (wasOffline.current) {
      wasOffline.current = false
      toast.success('Kembali online')
    }
  }, [isOffline])

  if (!isOffline) return null

  return (
    <div className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-sm animate-in fade-in slide-in-from-bottom-2 md:bottom-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--warn-bg)]">
          <WifiOff className="h-4 w-4 text-[var(--warn-fg)]" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Sedang offline</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Menyambung otomatis saat sinyal kembali.
          </p>
        </div>
      </div>
    </div>
  )
}
