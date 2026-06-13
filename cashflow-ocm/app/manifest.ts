import type { MetadataRoute } from 'next'

/**
 * Web App Manifest — bikin app installable & buka full-screen TANPA bar browser
 * (display: standalone). Next App Router auto-serve di /manifest.webmanifest +
 * inject <link rel="manifest">.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CV OCM Cashflow',
    short_name: 'CV OCM',
    description:
      'Sistem keuangan CV Omanda Cerli Mandiri — supplier TBS & BRDL ke PKS PT. BGA.',
    lang: 'id',
    // Buka app selalu dari opening (WelcomeScreen) → login → dashboard.
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
