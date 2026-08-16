'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

function subscribeToConnection(callback: () => void) {
  const handleOnline = () => callback()
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
      .then(() => {
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
