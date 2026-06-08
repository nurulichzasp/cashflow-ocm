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

  if (process.env.NODE_ENV === 'production' && !isCronSecretValid && !isManualSecretValid) {
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
    return NextResponse.json({ success, mode })
  } catch (error) {
    console.error('Daily summary error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
