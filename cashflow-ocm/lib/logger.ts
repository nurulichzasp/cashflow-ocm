// Sink error TERPUSAT (server). Saat ini: log terstruktur 1-baris JSON ke stdout
// (mendarat di Vercel runtime logs, mudah di-grep). Tujuan utamanya jadi SATU
// chokepoint: nanti tinggal isi blok "teruskan ke layanan" (Sentry/Axiom) tanpa
// menyentuh call site mana pun. Edge-safe (hanya console/Date/JSON).

export type ErrorSource =
  | 'server-request' // dari instrumentation.ts onRequestError
  | 'server-action'
  | 'route-handler'
  | 'client-boundary' // dari error boundary React via /api/client-error

export interface ErrorReport {
  source: ErrorSource
  message: string
  digest?: string
  stack?: string
  path?: string
  method?: string
  context?: Record<string, unknown>
}

export function logServerError(report: ErrorReport): void {
  const payload = {
    level: 'error',
    at: new Date().toISOString(),
    ...report,
  }
  // Satu baris JSON → mudah dicari/difilter di log Vercel.
  console.error('[app-error]', JSON.stringify(payload))

  // TODO(observability): bila SENTRY_DSN (atau sejenis) tersedia, teruskan
  // payload ke sana di sini — ini satu-satunya tempat yang perlu diubah.
}
