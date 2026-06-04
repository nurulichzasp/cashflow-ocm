export function fotoUrl(url: string, opts?: { absolute?: boolean }): string {
  if (!url) return ''
  if (!url.includes('blob.vercel-storage.com')) return url
  const path = `/api/foto?u=${encodeURIComponent(url)}`
  if (opts?.absolute && typeof window !== 'undefined') {
    return `${window.location.origin}${path}`
  }
  return path
}
