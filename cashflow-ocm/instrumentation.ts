import type { Instrumentation } from 'next'
import { logServerError } from '@/lib/logger'

// Chokepoint error SERVER global (Next 15+). Menangkap error di Server
// Components, Route Handlers, dan Server Actions yang tadinya cuma di-console.error
// tersebar (atau hilang). Diteruskan ke sink terpusat lib/logger.ts.
// Error mungkin sudah diproses React saat render RSC → andalkan `digest` untuk
// korelasi dengan layar error yang dilihat user.
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const e = err as (Error & { digest?: string }) | undefined
  logServerError({
    source: 'server-request',
    message: e?.message ?? String(err),
    digest: e?.digest,
    stack: e?.stack,
    path: request.path,
    method: request.method,
    context: {
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
    },
  })
}
