export async function clearPrivateBrowserCache(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return
  const keys = await window.caches.keys()
  await Promise.all(keys.filter((key) => key.startsWith('ocm-')).map((key) => window.caches.delete(key)))
}
