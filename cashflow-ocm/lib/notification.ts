import { db } from './db'
import { peron } from './db/schema'
import { eq } from 'drizzle-orm'
import { getTelegramChatIds } from './telegram-recipients'

/** Kirim satu pesan ke SATU chat. Lempar error bila gagal (ditangkap broadcast). */
async function sendToChat(token: string, chatId: string, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`chat ${chatId}: ${response.status} ${errText}`)
  }
}

/**
 * Broadcast pesan ke SEMUA chat ID terdaftar (getTelegramChatIds). Memakai
 * Promise.allSettled: satu penerima gagal (mis. belum menekan Start → "chat not
 * found") TIDAK menggagalkan pengiriman ke penerima lain; kegagalan di-log per
 * chat ID. Return true bila minimal satu penerima berhasil.
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatIds = getTelegramChatIds()

  if (!token || chatIds.length === 0) {
    console.warn('Telegram Notification: TELEGRAM_BOT_TOKEN atau daftar chat ID (TELEGRAM_CHAT_IDS/TELEGRAM_CHAT_ID) belum dikonfigurasi.')
    return false
  }

  const results = await Promise.allSettled(
    chatIds.map((chatId) => sendToChat(token, chatId, text)),
  )

  let anySuccess = false
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      anySuccess = true
    } else {
      const reason = r.reason instanceof Error ? r.reason.message : String(r.reason)
      console.error(`Telegram broadcast gagal ke chat ${chatIds[i]}:`, reason)
    }
  })

  return anySuccess
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
  createdByName?: string | null
  createdByRole?: string | null
}) {
  try {
    // Fetch peron name
    const peronData = await db.select({ nama: peron.nama }).from(peron).where(eq(peron.id, data.peronId)).limit(1)
    const peronNama = peronData[0]?.nama || 'Peron Tidak Dikenal'

    const userInfo = data.createdByName
      ? `👤 <b>Dibuat oleh:</b> ${data.createdByName}${data.createdByRole ? ` (${data.createdByRole})` : ''}`
      : null

    const message = [
      `<b>📥 TRANSAKSI PEMBELIAN BARU</b>`,
      userInfo,
      `📅 <b>Tanggal:</b> ${data.tanggal}`,
      `🏭 <b>Peron:</b> ${peronNama}`,
      `🏷️ <b>Kategori:</b> ${data.kategori}`,
      `⚖️ <b>Tonase:</b> ${data.tonase.toLocaleString('id-ID')} kg`,
      `💰 <b>Total Beli:</b> Rp ${data.totalBeli.toLocaleString('id-ID')}`,
      `📈 <b>Estimasi Untung:</b> Rp ${data.keuntungan.toLocaleString('id-ID')}`,
      `💳 <b>Status:</b> ${data.statusBayarPeron === 'lunas' ? '✅ Lunas' : '⏳ Belum Lunas'}`,
      `📝 <b>Catatan:</b> ${data.catatan || '-'}`,
    ].filter(Boolean).join('\n')

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
  createdByName?: string | null
  createdByRole?: string | null
}) {
  try {
    const userInfo = data.createdByName
      ? `👤 <b>Dibuat oleh:</b> ${data.createdByName}${data.createdByRole ? ` (${data.createdByRole})` : ''}`
      : null

    const message = [
      `<b>📤 TRANSAKSI PENJUALAN BARU</b>`,
      userInfo,
      `📅 <b>Tanggal:</b> ${data.tanggal}`,
      `📄 <b>No. Invoice:</b> ${data.noInvoice || '-'}`,
      `📄 <b>No. BAST:</b> ${data.noBast || '-'}`,
      `⚖️ <b>Total Bersih:</b> ${data.totalBersih ? `Rp ${data.totalBersih.toLocaleString('id-ID')}` : '-'}`,
      `💰 <b>Total Nilai:</b> ${data.totalNilai ? `Rp ${data.totalNilai.toLocaleString('id-ID')}` : '-'}`,
      `💳 <b>Status Bayar:</b> ${data.statusBayar === 'lunas' ? '✅ Lunas' : '⏳ Belum Lunas'}`,
      `📝 <b>Catatan:</b> ${data.catatan || '-'}`,
    ].filter(Boolean).join('\n')

    await sendTelegramMessage(message)
  } catch (error) {
    console.error('notifyNewPenjualan failed:', error)
  }
}

/**
 * Triggers a notification for a new Biaya Operasional transaction.
 */
export async function notifyNewBiaya(data: {
  tanggal: string
  kategori: string
  jumlah: number
  catatan?: string
  createdByName?: string | null
  createdByRole?: string | null
}) {
  try {
    const userInfo = data.createdByName
      ? `👤 <b>Dibuat oleh:</b> ${data.createdByName}${data.createdByRole ? ` (${data.createdByRole})` : ''}`
      : null

    const message = [
      `<b>💸 BIAYA OPERASIONAL BARU</b>`,
      userInfo,
      `📅 <b>Tanggal:</b> ${data.tanggal}`,
      `🏷️ <b>Kategori:</b> ${data.kategori}`,
      `💰 <b>Jumlah:</b> Rp ${data.jumlah.toLocaleString('id-ID')}`,
      `📝 <b>Catatan:</b> ${data.catatan || '-'}`,
    ].filter(Boolean).join('\n')

    await sendTelegramMessage(message)
  } catch (error) {
    console.error('notifyNewBiaya failed:', error)
  }
}
