// Dipakai error boundary (client component) untuk melaporkan crash render ke
// sink server (/api/client-error). Best-effort & gagal-diam: penanganan error
// tidak boleh pernah melempar lagi. `keepalive` supaya laporan tetap terkirim
// walau halaman sedang unmount / berpindah.
export function reportClientError(error: Error & { digest?: string }): void {
  try {
    const body = JSON.stringify({
      message: error?.message ?? String(error),
      digest: error?.digest,
      stack: error?.stack,
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    })
    fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* no-op */
  }
}
