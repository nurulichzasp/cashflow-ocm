'use client'

import { useSyncExternalStore } from 'react'

/**
 * Store ringan (module-level pub/sub) untuk visibilitas bottom nav.
 *
 * Kenapa store, bukan context? Scroll terjadi di dalam <main> milik
 * ScrollShell, sedangkan BottomNav adalah SIBLING-nya di layout. Store
 * module-level membiarkan keduanya berbagi state tanpa provider tambahan
 * dan tanpa prop drilling.
 */

type Listener = () => void

let visible = true
const listeners = new Set<Listener>()

export function setNavVisible(next: boolean) {
  if (next === visible) return
  visible = next
  listeners.forEach((l) => l())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return visible
}

function getServerSnapshot() {
  return true
}

/** Hook: true bila bar harus tampil. Auto-update saat scroll direction berubah. */
export function useNavVisible() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
