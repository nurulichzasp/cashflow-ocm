'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Landmark, Wallet } from 'lucide-react'
import { formatRupiah } from '@/lib/format'

export type AkunCard = {
  id: string
  nama: string
  tipe: 'bank' | 'tunai'
  saldo: number
  utama?: boolean
}

const GAP = 12 // px — selaras gap-3 di track

/**
 * Carousel akun kas — geser horizontal (scroll-snap) + dot indikator.
 *
 * GOTCHA SwipeNavigator: app pakai edge-swipe (geser dari TEPI layar = back).
 * Track diberi `data-no-swipe` (cocok NO_SWIPE_SELECTOR di swipe-navigator.tsx)
 * + `touch-action: pan-x` sehingga: geser kartu di tengah = pindah kartu, TIDAK
 * memicu router.back(); geser dari tepi kiri layar tetap back (gesture native
 * iOS — kita tak preventDefault). `overscroll-x-contain` cegah back via overscroll.
 */
export function AkunCarousel({ items }: { items: AkunCard[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const single = items.length <= 1

  const onScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const first = el.firstElementChild as HTMLElement | null
    if (!first) return
    const stride = first.offsetWidth + GAP
    const idx = Math.round(el.scrollLeft / stride)
    setActive(Math.max(0, Math.min(items.length - 1, idx)))
  }, [items.length])

  // rAF-throttle scroll → tracking dot tanpa thrash.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el || single) return
    let ticking = false
    const handler = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => { onScroll(); ticking = false })
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [onScroll, single])

  function goTo(idx: number) {
    const el = scrollerRef.current
    if (!el) return
    const first = el.firstElementChild as HTMLElement | null
    if (!first) return
    const stride = first.offsetWidth + GAP
    el.scrollTo({ left: idx * stride, behavior: 'smooth' })
  }

  return (
    <section aria-label="Akun kas">
      <div className="mb-2.5 flex items-center justify-between px-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
          Akun Kas
        </p>
        {!single && (
          <span className="text-[11px] font-medium text-stone-400 dark:text-zinc-500">Geser <span aria-hidden="true">→</span></span>
        )}
      </div>

      <div
        ref={scrollerRef}
        data-no-swipe
        className={
          single
            ? ''
            : '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        }
        style={single ? undefined : { touchAction: 'pan-x' }}
      >
        {items.map((a) => (
          <AccountCard key={a.id} akun={a} single={single} />
        ))}
      </div>

      {!single && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {items.map((a, i) => (
            <button
              key={a.id}
              type="button"
              aria-label={`Ke kartu ${a.nama}`}
              aria-current={i === active}
              onClick={() => goTo(i)}
              className="p-1.5 -m-1.5"
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  i === active
                    ? 'h-1.5 w-4 bg-[var(--brand-solid)] dark:bg-[var(--brand)]'
                    : 'h-1.5 w-1.5 bg-stone-300 dark:bg-white/20'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function AccountCard({ akun, single }: { akun: AkunCard; single: boolean }) {
  const Icon = akun.tipe === 'bank' ? Landmark : Wallet
  return (
    <article
      className={`surface press-card flex shrink-0 snap-start flex-col justify-between p-3.5 ${
        single ? 'w-full' : 'w-[78%] sm:w-[248px]'
      }`}
      style={{ minHeight: 92 }}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-stone-100 dark:bg-white/[0.06]">
          <Icon className="h-3.5 w-3.5 text-stone-600 dark:text-zinc-300" strokeWidth={2} />
        </span>
        <p className="min-w-0 truncate text-[13px] font-semibold text-stone-900 dark:text-zinc-100">{akun.nama}</p>
        <span className="ml-auto shrink-0 text-[9px] font-medium uppercase tracking-wider text-stone-400 dark:text-zinc-500">
          {akun.tipe === 'bank' ? 'Bank' : 'Tunai'}{akun.utama ? ' · Utama' : ''}
        </span>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">Saldo</p>
        <p className="truncate text-[1.3rem] font-bold leading-none tracking-tight num tabular-nums text-stone-900 dark:text-zinc-50">
          {formatRupiah(akun.saldo)}
        </p>
      </div>
    </article>
  )
}
