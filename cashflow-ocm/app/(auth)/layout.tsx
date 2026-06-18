import type { Viewport } from 'next'

// Layar auth (login) SELALU gelap (theme-independent) → themeColor browser/status-bar
// ikut gelap agar tak ada bilah putih di atas saat device bertema terang.
export const viewport: Viewport = {
  themeColor: '#0A0A0A',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
