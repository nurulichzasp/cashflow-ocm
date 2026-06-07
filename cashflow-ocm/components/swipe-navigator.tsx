'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * SwipeNavigator — gesture navigasi horizontal untuk konten utama.
 *
 *   geser KIRI  → router.back()
 *   geser KANAN → router.forward()
 *
 * CATATAN ARAH: ini KEBALIKAN kebiasaan iOS (di iOS geser kanan = back) dan
 * bisa bentrok dengan edge-swipe Safari. Kalau terasa aneh, cukup tukar
 * pemanggilan back()/forward() di blok "commit navigasi" di bawah.
 */

const THRESHOLD = 70 // px minimum perpindahan horizontal
const DIRECTION_RATIO = 1.5 // |dx| harus > |dy| * rasio ini → bukan scroll vertikal

// Elemen yang TIDAK boleh men-trigger swipe (chart, tabel, carousel, dsb).
const NO_SWIPE_SELECTOR =
  '[data-no-swipe],[data-slot="table-container"],.recharts-responsive-container,.recharts-wrapper'

export function SwipeNavigator({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const start = useRef<{ x: number; y: number } | null>(null)
  const blocked = useRef(false)

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY }
    // Jangan trigger kalau gesture mulai di area scroll-x (chart/tabel).
    blocked.current = !!(e.target as HTMLElement)?.closest?.(NO_SWIPE_SELECTOR)
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!start.current || blocked.current) {
      start.current = null
      return
    }
    const t = e.changedTouches[0]
    const dx = t.clientX - start.current.x
    const dy = t.clientY - start.current.y
    start.current = null

    // Harus dominan horizontal & melewati threshold.
    if (Math.abs(dx) < THRESHOLD) return
    if (Math.abs(dx) <= Math.abs(dy) * DIRECTION_RATIO) return

    // ── commit navigasi (tukar dua baris ini untuk membalik arah) ──
    if (dx < 0) router.back() // geser kiri
    else router.forward() // geser kanan
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="contents"
    >
      {children}
    </div>
  )
}
