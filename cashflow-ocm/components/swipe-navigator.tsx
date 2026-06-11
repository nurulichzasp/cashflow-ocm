'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * SwipeNavigator — gesture navigasi horizontal, HANYA dari tepi layar.
 * Mengikuti konvensi iOS (sama dengan edge-swipe bawaan Safari):
 *
 *   geser KANAN (mulai dari tepi KIRI)  → router.back()     // iOS: kiri = kembali
 *   geser KIRI  (mulai dari tepi KANAN) → router.forward()
 *
 * Arah ini SENGAJA setuju dengan edge-swipe native Safari (kiri = back); dulu
 * terbalik (kiri = forward) sehingga konflik dengan native → "back terasa kebalik".
 * Wajib mulai dari tepi layar (EDGE_ZONE) supaya scroll biasa di tengah
 * konten TIDAK pernah ke-trigger. Tidak ada preventDefault → gesture native
 * Safari tetap hidup.
 */

const EDGE_ZONE = 28 // px dari tepi layar — gesture WAJIB mulai di sini
const THRESHOLD = 64 // px minimum perpindahan horizontal
const DIRECTION_RATIO = 1.8 // |dx| harus > |dy| * rasio → bukan scroll vertikal

// Elemen yang TIDAK boleh men-trigger swipe (chart, tabel, carousel, dsb).
const NO_SWIPE_SELECTOR =
  '[data-no-swipe],[data-slot="table-container"],.recharts-responsive-container,.recharts-wrapper'

export function SwipeNavigator({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const start = useRef<{ x: number; y: number } | null>(null)
  const fromEdge = useRef(false)
  const blocked = useRef(false)

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY }
    blocked.current = !!(e.target as HTMLElement)?.closest?.(NO_SWIPE_SELECTOR)
    const w = window.innerWidth
    // hanya tandai bila jari MULAI menyentuh dari tepi kiri / kanan layar
    fromEdge.current = t.clientX <= EDGE_ZONE || t.clientX >= w - EDGE_ZONE
  }

  function onTouchEnd(e: React.TouchEvent) {
    const from = start.current
    const edge = fromEdge.current
    start.current = null
    fromEdge.current = false
    if (!from || blocked.current || !edge) return

    const t = e.changedTouches[0]
    const dx = t.clientX - from.x
    const dy = t.clientY - from.y

    // Harus dominan horizontal & melewati threshold.
    if (Math.abs(dx) < THRESHOLD) return
    if (Math.abs(dx) <= Math.abs(dy) * DIRECTION_RATIO) return

    // Konvensi iOS: geser KANAN dari tepi kiri = back; geser KIRI dari tepi kanan = forward.
    if (dx > 0) router.back()
    else router.forward()
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="contents">
      {children}
    </div>
  )
}
