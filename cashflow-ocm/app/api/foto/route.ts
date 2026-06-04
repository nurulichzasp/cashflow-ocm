import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(request.url)
  const u = searchParams.get('u')

  if (!u || !u.includes('blob.vercel-storage.com')) {
    return new Response('URL tidak valid', { status: 400 })
  }

  const blobRes = await fetch(u, {
    headers: {
      Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    },
  })

  if (!blobRes.ok) {
    return new Response('Foto tidak ditemukan', { status: blobRes.status })
  }

  const contentType = blobRes.headers.get('content-type') ?? 'image/jpeg'
  return new Response(blobRes.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
