/**
 * Bagikan teks nota lewat Web Share API (share sheet native iOS: WA, Telegram,
 * Pesan, Mail, Catatan, Salin, AirDrop — tanpa daftar manual). Fallback berurutan:
 *   1) navigator.share (native)  2) clipboard ('copied')  3) WA link ('wa')
 *
 * Default share TEKS (file/gambar support iOS terbatas). Dipanggil dari user
 * gesture (klik) di HTTPS — dua syarat Web Share sudah terpenuhi di app ini.
 */
export type ShareResult = 'shared' | 'copied' | 'wa'

export async function shareNota(data: { title: string; text: string; url?: string }): Promise<ShareResult> {
  const payload: ShareData = { title: data.title, text: data.text }
  if (data.url) payload.url = data.url

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (e) {
      // Batal oleh user (AbortError) → anggap selesai, jangan fallback.
      if (e instanceof DOMException && e.name === 'AbortError') return 'shared'
      // error lain → lanjut ke fallback
    }
  }

  const full = [data.text, data.url].filter(Boolean).join('\n\n')
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(full)
      return 'copied'
    } catch {
      // lanjut ke WA
    }
  }

  if (typeof window !== 'undefined') {
    window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, '_blank')
  }
  return 'wa'
}
