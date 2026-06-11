import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { rebuildPeronHealth } from '@/lib/peron-health/rebuild'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/**
 * Rebuild kesehatan peron. Target Vercel Cron (harian) + trigger manual.
 *   Cron: header `Authorization: Bearer <CRON_SECRET>`
 *   Manual: GET /api/peron-health/refresh?secret=<CRON_SECRET>
 * Wajib secret di SEMUA environment (endpoint menyentuh data keuangan).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const secretParam = new URL(request.url).searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET
  const ok =
    !!cronSecret &&
    (safeEqual(authHeader, `Bearer ${cronSecret}`) || safeEqual(secretParam, cronSecret))
  if (!ok) return new Response('Unauthorized', { status: 401 })

  try {
    const res = await rebuildPeronHealth()
    return NextResponse.json({ ok: true, ...res })
  } catch (e) {
    console.error('[peron-health refresh]', e)
    return NextResponse.json({ ok: false, error: 'rebuild gagal' }, { status: 500 })
  }
}
