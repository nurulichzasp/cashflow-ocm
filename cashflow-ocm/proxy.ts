import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Public paths — TIDAK perlu session cookie.
 * Cron & webhook endpoint diamankan via secret token (query/header),
 * bukan via session — jadi harus dilewatkan dari auth proxy ini.
 */
const publicPaths = [
  '/login',
  '/api/auth',          // better-auth internal
  '/api/cron',          // Vercel cron (auth: Bearer CRON_SECRET)
  '/api/peron-health',  // Cron rebuild kesehatan peron (auth: Bearer/secret CRON_SECRET)
  '/api/backup',        // Backup terjadwal POST (auth: Bearer BACKUP_TOKEN); GET cek session di route
  '/api/telegram',      // Telegram webhook (auth: ?secret=...)
  '/api/parse-bast',    // Parser BAST (auth: cek session di dalam route handler)
  '/manifest.webmanifest', // PWA manifest — browser baca tanpa login (install)
  '/sw.js',             // Service worker — wajib publik biar bisa di-register
  '/offline',           // Fallback offline (di-precache SW) — tak boleh redirect
  '/p/',                // Portal peron publik (read-only, validasi token di server).
                        // WAJIB trailing slash — '/p' saja akan cocok /peron, /penjualan, dst.
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  // '/' = welcome/splash, harus EXACT-match (jangan masuk publicPaths startsWith
  // — '/' akan cocok dengan SEMUA path & membuka seluruh gate).
  const isPublic = pathname === '/' || publicPaths.some((p) => pathname.startsWith(p))

  const sessionToken =
    request.cookies.get('better-auth.session_token')?.value ??
    request.cookies.get('__Secure-better-auth.session_token')?.value

  if (!isPublic && !sessionToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname === '/login' && sessionToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
