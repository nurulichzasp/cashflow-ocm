import { put } from '@vercel/blob'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

const MAX_SIZE = 8 * 1024 * 1024 // 8 MB

type Detected = { ext: string; mime: string }

// Deteksi tipe gambar dari magic-bytes isi file — bukan dari nama file atau
// file.type yang dikirim klien (keduanya mudah dipalsukan). Dukungan: JPEG,
// PNG, WebP, GIF.
function detectImageType(bytes: Uint8Array): Detected | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' }
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' }
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61
  ) {
    return { ext: 'gif', mime: 'image/gif' }
  }
  // WebP: "RIFF"...."WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' }
  }
  return null
}

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('[upload-foto] BLOB_READ_WRITE_TOKEN tidak dikonfigurasi')
    return Response.json({ error: 'Konfigurasi penyimpanan belum diatur. Hubungi administrator.' }, { status: 500 })
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Request tidak valid' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return Response.json({ error: 'File tidak ditemukan' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'Ukuran file melebihi 8 MB' }, { status: 413 })
  }

  // Validasi isi file via magic-bytes, lalu pakai ekstensi & contentType hasil
  // deteksi (bukan input klien).
  const bytes = new Uint8Array(await file.arrayBuffer())
  const detected = detectImageType(bytes)
  if (!detected) {
    return Response.json({ error: 'File harus berupa gambar (JPG, PNG, WebP, GIF)' }, { status: 400 })
  }

  const filename = `foto-bukti/${Date.now()}-${Math.random().toString(36).slice(2)}.${detected.ext}`

  try {
    const blob = await put(filename, file, {
      access: 'private',
      contentType: detected.mime,
    })
    return Response.json({ url: blob.url })
  } catch (err) {
    console.error('[upload-foto] Blob error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: `Upload gagal: ${msg}` }, { status: 500 })
  }
}
