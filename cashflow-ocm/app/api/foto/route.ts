import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { get } from '@vercel/blob'

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(request.url)
  const u = searchParams.get('u')

  // Validasi host yang SUDAH di-parse, bukan substring. Substring `.includes()`
  // bisa ditembus URL seperti https://evil.com/?x=blob.vercel-storage.com,
  // yang membuat server mem-fetch situs penyerang sambil membawa token Blob.
  let target: URL
  try {
    target = new URL(u ?? '')
  } catch {
    return new Response('URL tidak valid', { status: 400 })
  }
  if (target.protocol !== 'https:' || !target.hostname.endsWith('.blob.vercel-storage.com')) {
    return new Response('URL tidak valid', { status: 400 })
  }

  try {
    // SDK memverifikasi bahwa URL benar-benar milik store yang terikat token.
    // Token tidak pernah lagi diteruskan ke host arbitrer hasil input pengguna.
    const blob = await get(target.toString(), {
      access: 'private',
      abortSignal: AbortSignal.timeout(10_000),
    })
    if (!blob) return new Response('Foto tidak ditemukan', { status: 404 })
    if (blob.statusCode !== 200 || !blob.stream || !blob.blob.contentType) {
      return new Response(null, { status: 304 })
    }
    if (!IMAGE_TYPES.has(blob.blob.contentType)) {
      return new Response('Tipe berkas ditolak', { status: 415 })
    }
    return new Response(blob.stream, {
      headers: {
        'Content-Type': blob.blob.contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    })
  } catch (error) {
    console.error('[foto] Gagal mengambil blob tervalidasi:', error)
    return new Response('Foto tidak ditemukan', { status: 404 })
  }
}
