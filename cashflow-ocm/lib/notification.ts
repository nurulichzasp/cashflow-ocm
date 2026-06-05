import { db } from './db'
import { peron } from './db/schema'
import { eq } from 'drizzle-orm'

/**
 * Sends a message to a Telegram chat using Telegram Bot API.
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    console.warn('Telegram Notification: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured.')
    return false
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Telegram API error:', errText)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to send Telegram message:', error)
    return false
  }
}

/**
 * Triggers a notification for a new Pembelian transaction.
 */
export async function notifyNewPembelian(data: {
  tanggal: string
  kategori: string
  peronId: string
  tonase: number
  totalBeli: number
  keuntungan: number
  statusBayarPeron: string
  catatan?: string
}) {
  try {
    // Fetch peron name
    const peronData = await db.select({ nama: peron.nama }).from(peron).where(eq(peron.id, data.peronId)).limit(1)
    const peronNama = peronData[0]?.nama || 'Peron Tidak Dikenal'

    const message = [
      `<b>📥 TRANSAKSI PEMBELIAN BARU</b>`,
      `📅 <b>Tanggal:</b> ${data.tanggal}`,
      `🏭 <b>Peron:</b> ${peronNama}`,
      `🏷️ <b>Kategori:</b> ${data.kategori}`,
      `⚖️ <b>Tonase:</b> ${data.tonase.toLocaleString('id-ID')} kg`,
      `💰 <b>Total Beli:</b> Rp ${data.totalBeli.toLocaleString('id-ID')}`,
      `📈 <b>Estimasi Untung:</b> Rp ${data.keuntungan.toLocaleString('id-ID')}`,
      `💳 <b>Status:</b> ${data.statusBayarPeron === 'lunas' ? '✅ Lunas' : '⏳ Belum Lunas'}`,
      `📝 <b>Catatan:</b> ${data.catatan || '-'}`,
    ].join('\n')

    await sendTelegramMessage(message)
  } catch (error) {
    console.error('notifyNewPembelian failed:', error)
  }
}

/**
 * Triggers a notification for a new Penjualan transaction.
 */
export async function notifyNewPenjualan(data: {
  tanggal: string
  noInvoice?: string
  noBast?: string
  totalBersih?: number
  totalNilai?: number
  statusBayar: string
  catatan?: string
}) {
  try {
    const message = [
      `<b>📤 TRANSAKSI PENJUALAN BARU</b>`,
      `📅 <b>Tanggal:</b> ${data.tanggal}`,
      `📄 <b>No. Invoice:</b> ${data.noInvoice || '-'}`,
      `📄 <b>No. BAST:</b> ${data.noBast || '-'}`,
      `⚖️ <b>Total Bersih:</b> ${data.totalBersih ? `Rp ${data.totalBersih.toLocaleString('id-ID')}` : '-'}`,
      `💰 <b>Total Nilai BGA:</b> ${data.totalNilai ? `Rp ${data.totalNilai.toLocaleString('id-ID')}` : '-'}`,
      `💳 <b>Status Bayar:</b> ${data.statusBayar === 'lunas' ? '✅ Lunas' : '⏳ Belum Lunas'}`,
      `📝 <b>Catatan:</b> ${data.catatan || '-'}`,
    ].join('\n')

    await sendTelegramMessage(message)
  } catch (error) {
    console.error('notifyNewPenjualan failed:', error)
  }
}
