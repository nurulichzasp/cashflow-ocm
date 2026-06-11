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

// Nama cookie sesi Better Auth (varian __Secure- dipakai di HTTPS/produksi).
const SESSION_COOKIE_NAMES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
]

function clearSessionCookies(res: NextResponse) {
  // Cookie sesi yang sudah expired di server tapi masih "nyangkut" di browser
  // (mis. PWA standalone iOS) harus dibersihkan, jika tidak bisa terjadi loop:
  // /login lihat ada cookie → redirect /dashboard → sesi invalid → /login → ...
  for (const name of SESSION_COOKIE_NAMES) res.cookies.delete(name)
}

/**
 * VALIDASI sesi ke server — bukan sekadar cek keberadaan cookie. Memanggil
 * endpoint get-session Better Auth dengan cookie yang diteruskan; karena
 * cookieCache dimatikan (lihat lib/auth.ts), ini memvalidasi ke DB sehingga
 * sesi yang sudah expired pasti ditolak (return false), bukan lolos.
 *
 * Return:
 *  - true  → sesi valid
 *  - false → sesi tidak ada / expired / ditolak server (respons jelas)
 *  - null  → gagal menghubungi server (error transien). Caller fail-open dan
 *            mengandalkan validasi backstop di layout/server action, supaya
 *            blip jaringan internal tidak menendang user yang sesinya valid.
 */
async function isSessionValid(request: NextRequest): Promise<boolean | null> {
  try {
    const res = await fetch(new URL('/api/auth/get-session', request.url), {
      headers: { cookie: request.headers.get('cookie') ?? '' },
      cache: 'no-store',
    })
    if (!res.ok) return false
    const session = await res.json().catch(() => null)
    return !!session && !!session.user
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  // '/' = welcome/splash, harus EXACT-match (jangan masuk publicPaths startsWith
  // — '/' akan cocok dengan SEMUA path & membuka seluruh gate).
  const isPublic = pathname === '/' || publicPaths.some((p) => pathname.startsWith(p))

  const sessionToken =
    request.cookies.get('better-auth.session_token')?.value ??
    request.cookies.get('__Secure-better-auth.session_token')?.value

  // Tanpa cookie sama sekali: tak perlu validasi ke server.
  if (!sessionToken) {
    if (!isPublic) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // Ada cookie. Validasi hanya diperlukan untuk path terproteksi dan untuk
  // /login (yang me-redirect ke /dashboard kalau sesi benar-benar valid).
  // Path publik lain (mis. '/', '/offline', '/p/...') dilewatkan — '/' sendiri
  // sudah mengecek sesi di server (app/page.tsx) sebelum redirect.
  const needsValidation = !isPublic || pathname === '/login'
  if (!needsValidation) {
    return NextResponse.next()
  }

  const valid = await isSessionValid(request)

  // Sesi expired/ditolak (respons jelas dari server): bersihkan cookie nyangkut
  // dan arahkan ke /login dengan pesan. fail-open (null) → lanjut, backstop di
  // layout/server action yang menentukan.
  if (valid === false) {
    if (pathname === '/login') {
      // Sudah di /login: jangan redirect (hindari loop), cukup bersihkan cookie.
      const res = NextResponse.next()
      clearSessionCookies(res)
      return res
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    loginUrl.searchParams.set('reason', 'expired')
    const res = NextResponse.redirect(loginUrl)
    clearSessionCookies(res)
    return res
  }

  // Sesi valid (atau gagal cek → fail-open): sudah login, jangan tampilkan
  // form /login lagi.
  if (pathname === '/login' && valid === true) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
