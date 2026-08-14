'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

function subscribeToConnection(callback: () => void) {
  const handleOnline = () => {
    callback()
    // Trigger sync when coming back online (Background Sync API — belum ada
    // di lib DOM bawaan, jadi akses lewat cast aman)
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        return (registration as unknown as { sync: { register(tag: string): Promise<void> } })
          .sync.register('sync-offline-queue')
      }).catch((error) => {
        console.error('[App] Background sync registration failed:', error)
      })
    }
  }
  const handleOffline = () => callback()

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

const getOnlineSnapshot = () => navigator.onLine
const getServerOnlineSnapshot = () => true

export function useOffline() {
  const isOnline = useSyncExternalStore(
    subscribeToConnection,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  )
  const [swRegistered, setSwRegistered] = useState(false)

  // Register service worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[App] Service Worker registered')
        setSwRegistered(true)
      })
      .catch((error) => {
        console.error('[App] Service Worker registration failed:', error)
      })
  }, [])

  return {
    isOnline,
    isOffline: !isOnline,
    swRegistered,
  }
}
