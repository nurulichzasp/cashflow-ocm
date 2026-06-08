'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Hero count-up untuk angka Rupiah ringkas (premium glance).
 * - Unit (M / jt / rb) ditentukan SEKALI dari nilai akhir, lalu mantissa di-count
 *   0 → nilai. Unit tidak ikut berubah saat menghitung (tanpa flicker).
 * - SSR merender nilai final (cocok dengan hydration, aman tanpa-JS).
 * - Hormati prefers-reduced-motion (langsung tampil final).
 * - Hierarki tipografi elegan: "Rp" kecil-muted · angka besar · unit muted.
 */
export function AnimatedRupiah({ value }: { value: number }) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  let div = 1
  let unit = ''
  let dec = 0
  if (abs >= 1_000_000_000) { div = 1_000_000_000; unit = 'M'; dec = 2 }
  else if (abs >= 1_000_000) { div = 1_000_000; unit = 'jt'; dec = 1 }
  else if (abs >= 1_000) { div = 1_000; unit = 'rb'; dec = 0 }
  const target = abs / div
  const fmt = (v: number) =>
    v.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: dec })

  const [n, setN] = useState(target) // SSR & first paint = final (no hydration mismatch)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || target === 0) { setN(target); return }
    let raf = 0
    let t0 = 0
    const dur = 850
    const tick = (t: number) => {
      if (!t0) t0 = t
      const p = Math.min(1, (t - t0) / dur)
      const eased = 1 - Math.pow(1 - p, 4) // ease-out-quart
      setN(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return (
    <>
      <span className="align-baseline text-lg sm:text-xl font-semibold text-stone-400 dark:text-zinc-500 mr-1.5">Rp</span>
      <span className="text-[2.6rem] sm:text-[3.4rem] font-bold">{sign}{fmt(n)}</span>
      {unit && <span className="text-xl sm:text-2xl font-semibold text-stone-400 dark:text-zinc-500 ml-1.5">{unit}</span>}
    </>
  )
}
