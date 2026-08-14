'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => undefined
const getClientSnapshot = () => true
const getServerSnapshot = () => false

/** Menandai bahwa komponen sudah memakai snapshot browser tanpa effect/setState. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
}
