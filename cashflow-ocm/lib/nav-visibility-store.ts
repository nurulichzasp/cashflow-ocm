'use client'

import { useSyncExternalStore } from 'react'

/**
 * Store ringan (module-level pub/sub) untuk MODE COMPACT bottom nav.
 *
 * Kenapa store, bukan context? Scroll terjadi di dalam <main> milik
 * ScrollShell, sedangkan BottomNav & FAB adalah SIBLING-nya di layout. Store
 * module-level membiarkan ketiganya berbagi state tanpa provider tambahan
 * dan tanpa prop drilling.
 *
 * compact = true  → scroll ke bawah: bar mengecil (label disembunyikan).
 * compact = false → di atas / scroll ke atas: bar ukuran penuh.
 */

type Listener = () => void

let compact = false
const listeners = new Set<Listener>()

export function setNavCompact(next: boolean) {
  if (next === compact) return
  compact = next
  listeners.forEach((l) => l())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return compact
}

function getServerSnapshot() {
  return false
}

/** Hook: true bila bar harus compact (mengecil). Auto-update saat arah scroll berubah. */
export function useNavCompact() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
