import { put } from '@vercel/blob'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

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

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
  const filename = `foto-bukti/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`

  try {
    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type || 'image/jpeg',
    })
    return Response.json({ url: blob.url })
  } catch (err) {
    console.error('[upload-foto] Blob error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: `Upload gagal: ${msg}` }, { status: 500 })
  }
}
