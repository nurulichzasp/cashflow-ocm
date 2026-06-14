/**
 * SATU sumber kebenaran daftar chat ID Telegram — dipakai BAIK oleh pengirim
 * notifikasi (lib/notification.ts) MAUPUN whitelist webhook
 * (app/api/telegram/webhook) agar keduanya tak pernah beda.
 *
 * Aturan: TELEGRAM_CHAT_IDS (dipisah koma, multi-penerima) diutamakan; bila
 * kosong, fallback ke TELEGRAM_CHAT_ID tunggal lama (kompatibilitas deploy lama).
 * Hasil di-dedup. Satu-satunya tempat daftar chat ID dibangun — jangan hardcode
 * array chat ID di tempat lain.
 */
export function getTelegramChatIds(): string[] {
  const multi = (process.env.TELEGRAM_CHAT_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (multi.length > 0) return Array.from(new Set(multi))

  // Fallback ke env tunggal lama
  const single = (process.env.TELEGRAM_CHAT_ID ?? '').trim()
  return single ? [single] : []
}
