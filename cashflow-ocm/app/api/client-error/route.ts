import { logServerError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Sink untuk error render SISI-KLIEN (React error boundary). onRequestError di
// instrumentation.ts hanya menangkap error server, jadi crash render di HP user
// butuh jalur ini. SENGAJA tanpa auth: dipanggil justru saat app mungkin sedang
// rusak (sesi pun bisa gagal). Payload dibatasi panjangnya & hanya dicatat —
// tak menyentuh DB, tak pernah melempar.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const s = (v: unknown, max: number) => (v == null ? undefined : String(v).slice(0, max))
    logServerError({
      source: 'client-boundary',
      message: s(body?.message, 500) ?? 'unknown client error',
      digest: s(body?.digest, 100),
      stack: s(body?.stack, 2000),
      path: s(body?.path, 300),
    })
  } catch {
    // Endpoint pelaporan error tidak boleh pernah melempar.
  }
  return new Response(null, { status: 204 })
}
