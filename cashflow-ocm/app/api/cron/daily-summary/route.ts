import { NextResponse } from 'next/server'
import { sendTelegramMessage } from '@/lib/notification'
import {
  snapshotDailyRecap,
  snapshotHarga,
  snapshotPiutang,
} from '@/lib/telegram-snapshots'
import { timingSafeEqual } from 'node:crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Bandingkan secret secara timing-safe untuk mempersempit timing attack.
function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/**
 * Cron daily summary. Fires automatically dari vercel.json:
 *   - Sore (18:00 WIB / 11:00 UTC) → mode=evening (rekap hari ini)
 *   - Pagi (07:00 WIB / 00:00 UTC) → mode=morning (harga + piutang briefing)
 *
 * Manual trigger:
 *   GET /api/cron/daily-summary?secret=<CRON_SECRET>&mode=evening
 *
 * Header `Authorization: Bearer <CRON_SECRET>` digunakan Vercel Cron.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const { searchParams } = new URL(request.url)
  const secretParam = searchParams.get('secret')
  const mode = (searchParams.get('mode') ?? 'evening') as 'morning' | 'evening'

  const cronSecret = process.env.CRON_SECRET
  const isCronSecretValid = !!cronSecret && safeEqual(authHeader, `Bearer ${cronSecret}`)
  const isManualSecretValid = !!cronSecret && safeEqual(secretParam, cronSecret)

  // Selalu wajib secret (bukan hanya di production) — cegah endpoint ringkasan
  // keuangan terbuka di environment non-production / lokal.
  if (!isCronSecretValid && !isManualSecretValid) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    let message: string

    if (mode === 'morning') {
      // Briefing pagi: harga lapangan + piutang yang perlu ditagih
      const [harga, piutang] = await Promise.all([
        snapshotHarga(),
        snapshotPiutang(),
      ])
      message = [
        `<b>☀️ BRIEFING PAGI</b>`,
        ``,
        harga,
        ``,
        piutang,
      ].join('\n')
    } else {
      // Wrap sore: rekap transaksi + saldo akhir
      message = await snapshotDailyRecap()
    }

    const success = await sendTelegramMessage(message)

    // Rebuild kesehatan peron sekalian (sekali/hari) — digabung ke cron ini agar
    // andal di plan Vercel mana pun tanpa cron terpisah. Gagal di sini TIDAK
    // mengganggu ringkasan harian.
    let peronHealth: unknown = null
    try {
      const { rebuildPeronHealth } = await import('@/lib/peron-health/rebuild')
      peronHealth = await rebuildPeronHealth()
    } catch (e) {
      console.error('Daily peron-health rebuild error:', e)
    }

    return NextResponse.json({ success, mode, peronHealth })
  } catch (error) {
    console.error('Daily summary error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
