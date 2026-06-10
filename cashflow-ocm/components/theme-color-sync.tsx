'use client'

import { useTheme } from 'next-themes'
import { useEffect } from 'react'

/**
 * Sinkronkan <meta name="theme-color"> dengan tema AKTIF (termasuk override
 * manual via next-themes). Tanpa ini, status bar Safari memakai media query
 * sistem dan tidak ikut saat user memaksa terang/gelap di Pengaturan app.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (!resolvedTheme) return
    const color = resolvedTheme === 'dark' ? '#000000' : '#F2F2F7'
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.parentNode?.removeChild(m))
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = color
    document.head.appendChild(meta)
  }, [resolvedTheme])

  return null
}
