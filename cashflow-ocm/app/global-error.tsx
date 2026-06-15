'use client'

import { useEffect } from 'react'
import { reportClientError } from '@/lib/report-client-error'

/**
 * Fallback paling luar — dipakai bila root layout sendiri gagal. Mengganti
 * <html>/<body>, jadi tak bisa andalkan style app; pakai inline style minimal
 * yang menyatu dengan tema gelap default app.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportClientError(error) // crash root layout pun tercatat di server sink
  }, [error])

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#191919',
          color: '#F3F4F6',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <p style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 6px' }}>Aplikasi bermasalah</p>
          <p style={{ fontSize: '14px', color: '#9CA3AF', margin: '0 0 20px', lineHeight: 1.5 }}>
            Terjadi kesalahan tak terduga. Muat ulang halaman untuk melanjutkan.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#0E7A57',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '11px 22px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  )
}
