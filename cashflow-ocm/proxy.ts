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
  '/api/telegram',      // Telegram webhook (auth: ?secret=...)
  '/api/parse-bast',    // Parser publik (auth: rate-limited)
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))

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
