const CACHE_NAME = 'cashflow-ocm-v1'
const OFFLINE_QUEUE_KEY = 'offline-queue'

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/pembelian',
  '/penjualan',
  '/kas',
  '/biaya',
]

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Gracefully handle failures (e.g., offline during install)
        console.log('[SW] Some assets could not be cached')
      })
    })
  )
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Fetch: serve from cache, fallback to network, queue POST for offline
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests initially, handle POST/PUT/DELETE offline
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
    event.respondWith(
      fetch(request).catch(() => {
        // Queue the request for later
        if (self.registration.sync) {
          self.registration.sync.register('sync-offline-queue')
        }

        // Return a response indicating offline
        return new Response(
          JSON.stringify({ offline: true, queued: true }),
          {
            status: 202,
            statusText: 'Accepted - Queued for sync',
            headers: { 'Content-Type': 'application/json' },
          }
        )
      })
    )
    return
  }

  // GET requests: network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok && request.method === 'GET') {
          const cache = caches.open(CACHE_NAME)
          cache.then((c) => c.put(request, response.clone()))
        }
        return response
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cached) => {
          if (cached) {
            return cached
          }

          // No cache, return offline page
          return new Response(
            JSON.stringify({ offline: true, cached: false }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' },
            }
          )
        })
      })
  )
})

// Background sync: retry queued requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue())
  }
})

async function syncOfflineQueue() {
  const db = await openIDB()
  const queue = await getOfflineQueue(db)

  for (const request of queue) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      })

      if (response.ok) {
        // Remove from queue on success
        await removeFromQueue(db, request.id)
      }
    } catch (error) {
      console.log('[SW] Sync failed, will retry later:', error)
      // Keep in queue for next sync
    }
  }
}

// IndexedDB helpers for offline queue
function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cashflow-offline', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

function getOfflineQueue(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['queue'], 'readonly')
    const store = transaction.objectStore('queue')
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

function removeFromQueue(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['queue'], 'readwrite')
    const store = transaction.objectStore('queue')
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}
