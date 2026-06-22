/* Service Worker — "tahan sinyal jelek" untuk CV OCM Cashflow (Level 2).
 * Cache app-shell + fallback offline. TIDAK menyimpan/queue tulisan offline:
 * mutasi (POST/server action) & /api SELALU ke jaringan — kalau offline ia
 * GAGAL JUJUR (app tampilkan error), bukan pura-pura sukses. Aset berhash =
 * cache-first; navigasi = network-first (data segar saat online) → cache →
 * halaman /offline. No-op di localhost agar dev (HMR) tak terganggu.
 * Bump VERSION untuk paksa cache baru di rilis berikutnya.
 */
const VERSION = 'v6'
const CACHE = `ocm-${VERSION}`
const PRECACHE = ['/offline', '/icon-192.png', '/icon-512.png', '/icon.svg']

self.addEventListener('install', (event) => {
  // Langsung ambil alih — penting agar SW lama (yang sempat "queue" POST palsu)
  // segera tergantikan, tak menunggu semua tab ditutup.
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u)))),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  // Mutasi (POST/PUT/DELETE/server action) tidak disentuh — biar ke jaringan apa
  // adanya; offline = error asli, TIDAK di-queue (cegah entri keuangan hilang/dobel).
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // Dev: jangan ikut campur (hindari stale chunk & HMR rusak)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return
  // Auth, mutasi, cron, dsb. selalu ke jaringan
  if (url.pathname.startsWith('/api/')) return

  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/__nextjs_font') ||
    /\.(?:js|css|woff2?|png|jpe?g|svg|ico|webp|gif)$/.test(url.pathname)

  if (isStatic) {
    // Aset berhash → cache-first
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        try {
          const res = await fetch(request)
          if (res.ok) (await caches.open(CACHE)).put(request, res.clone())
          return res
        } catch {
          return cached || Response.error()
        }
      })(),
    )
    return
  }

  // Navigasi & RSC → network-first, fallback cache, lalu /offline
  event.respondWith(
    (async () => {
      try {
        const res = await fetch(request)
        if (res.ok && request.mode === 'navigate') {
          ;(await caches.open(CACHE)).put(request, res.clone())
        }
        return res
      } catch {
        const cached = await caches.match(request)
        if (cached) return cached
        if (request.mode === 'navigate') {
          const offline = await caches.match('/offline')
          if (offline) return offline
        }
        return Response.error()
      }
    })(),
  )
})
