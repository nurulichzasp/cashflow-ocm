'use client'

import { useOffline } from '@/hooks/use-offline'
import { AlertCircle, WifiOff } from 'lucide-react'

export function OfflineIndicator() {
  const { isOffline } = useOffline()

  if (!isOffline) return null

  return (
    <div className="fixed bottom-24 md:bottom-0 left-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-3 rounded-lg border border-red-500 bg-red-50 dark:bg-red-900 dark:border-red-700 px-4 py-3">
        <WifiOff className="h-4 w-4 text-red-600 dark:text-red-200 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            Anda sedang offline
          </p>
          <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
            Perubahan akan disinkronkan saat kembali online
          </p>
        </div>
      </div>
    </div>
  )
}
