/**
 * Telegram Webhook Endpoint
 *
 * Setup (sekali setelah deploy):
 *   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://cashflow-ocm-d61i.vercel.app/api/telegram/webhook?secret=<WEBHOOK_SECRET>"
 *
 * Env yang diperlukan:
 *   TELEGRAM_BOT_TOKEN     — token dari @BotFather
 *   TELEGRAM_CHAT_IDS      — daftar chat ID penerima/boleh-akses (koma); fallback TELEGRAM_CHAT_ID
 *   TELEGRAM_WEBHOOK_SECRET — random string, diverifikasi via ?secret=
 */

import { NextResponse } from 'next/server'
import {
  snapshotHariIni,
  snapshotSaldo,
  snapshotPiutang,
  snapshotHarga,
  snapshotMargin,
  snapshotPeron,
  snapshotDailyRecap,
  snapshotHelp,
} from '@/lib/telegram-snapshots'
import { getTelegramChatIds } from '@/lib/telegram-recipients'
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

/** Reply via Bot API. */
async function reply(chatId: number | string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })
}

/** Dispatch perintah ke snapshot builder. */
async function handleCommand(cmd: string): Promise<string> {
  const c = cmd.toLowerCase().split('@')[0] // strip @botname suffix
  switch (c) {
    case '/start':
    case '/help':
      return snapshotHelp()
    case '/hari':
    case '/today':
      return await snapshotHariIni()
    case '/saldo':
    case '/balance':
      return await snapshotSaldo()
    case '/piutang':
      return await snapshotPiutang()
    case '/harga':
    case '/price':
      return await snapshotHarga()
    case '/margin':
    case '/laba':
      return await snapshotMargin()
    case '/peron':
      return await snapshotPeron()
    case '/laporan':
    case '/report':
      return await snapshotDailyRecap()
    default:
      return [
        `❓ Perintah tidak dikenal: <code>${cmd}</code>`,
        ``,
        snapshotHelp(),
      ].join('\n')
  }
}

type TelegramUpdate = {
  message?: {
    chat?: { id?: string | number }
    text?: string
  }
}

export async function POST(req: Request) {
  // 1. Verifikasi secret: terima header resmi Telegram
  //    (X-Telegram-Bot-Api-Secret-Token) ATAU ?secret= (legacy), timing-safe.
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  const headerSecret = req.headers.get('x-telegram-bot-api-secret-token')
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET

  if (!expected || (!safeEqual(headerSecret, expected) && !safeEqual(secret, expected))) {
    return new Response('Unauthorized', { status: 401 })
  }

  let update: TelegramUpdate
  try {
    update = await req.json() as TelegramUpdate
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 })
  }

  const message = update?.message
  if (!message) {
    // Tidak ada message (mis. edited_message, callback_query) — abaikan
    return NextResponse.json({ ok: true })
  }

  const chatId = message.chat?.id
  const text = (message.text || '').trim()

  // 2. Whitelist: hanya chat di daftar resmi (TELEGRAM_CHAT_IDS / fallback
  //    TELEGRAM_CHAT_ID). SATU sumber dgn pengirim notifikasi → semua penerima
  //    di daftar punya akses command setara.
  const allowedChatIds = getTelegramChatIds()
  if (!chatId || !allowedChatIds.includes(String(chatId))) {
    // Diam-diam abaikan; jangan beri tahu bot tidak resmi
    return NextResponse.json({ ok: true })
  }

  // 3. Hanya respon teks yang dimulai dengan /
  if (!text.startsWith('/')) {
    await reply(chatId, snapshotHelp())
    return NextResponse.json({ ok: true })
  }

  try {
    const replyText = await handleCommand(text)
    await reply(chatId, replyText)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook command error:', error)
    await reply(chatId, '⚠️ Maaf, ada error di server. Coba lagi nanti.')
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

/** GET handler untuk health check + setup webhook one-shot. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  const secret = url.searchParams.get('secret')

  if (!safeEqual(secret, process.env.TELEGRAM_WEBHOOK_SECRET)) {
    return new Response('Unauthorized', { status: 401 })
  }

  // ?action=setup — auto-register webhook ke Telegram
  if (action === 'setup') {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const webhookUrl = `${url.origin}/api/telegram/webhook?secret=${encodeURIComponent(secret!)}`
    const res = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    )
    const data = await res.json()
    return NextResponse.json({ webhookUrl, telegram: data })
  }

  // ?action=commands — register slash command menu di Telegram client
  if (action === 'commands') {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const commands = [
      { command: 'hari', description: 'Ringkasan transaksi hari ini' },
      { command: 'saldo', description: 'Saldo rekening & kas' },
      { command: 'piutang', description: 'Penjualan belum lunas' },
      { command: 'harga', description: 'Harga acuan lapangan' },
      { command: 'margin', description: 'Net margin & profitabilitas' },
      { command: 'peron', description: 'Daftar peron aktif' },
      { command: 'laporan', description: 'Rekap lengkap hari ini' },
      { command: 'help', description: 'Tampilkan menu bantuan' },
    ]
    const res = await fetch(
      `https://api.telegram.org/bot${token}/setMyCommands`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands }),
      }
    )
    return NextResponse.json(await res.json())
  }

  // Default — info status
  return NextResponse.json({
    ok: true,
    hint: 'Use ?action=setup atau ?action=commands',
    botTokenConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
    chatIdsConfigured: getTelegramChatIds().length,
  })
}
