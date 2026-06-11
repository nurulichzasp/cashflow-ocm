'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * WelcomeScreen — layar sambutan sebelum login (bukan langsung form). Latar
 * gelap selaras app + login, monogram OCM, CTA emerald "Masuk" → /login.
 * Safe-area aman (Dynamic Island + home indicator), 100dvh.
 */
export function WelcomeScreen() {
  const router = useRouter()
  const [going, setGoing] = useState(false)

  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-between bg-[#141417] px-6 text-center"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 2rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)',
      }}
    >
      {/* Glow lembut di belakang logo */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative">
          <span
            aria-hidden
            className="absolute -inset-6 rounded-[2rem] bg-[var(--brand-solid)]/20 blur-2xl"
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--brand-solid)] text-2xl font-bold tracking-tight text-white shadow-[0_10px_36px_rgba(14,122,88,0.45)]">
            OCM
          </div>
        </div>

        <h1 className="mt-7 text-2xl font-bold tracking-tight text-white">Cashflow OCM</h1>
        <p className="mt-1 text-sm font-medium text-zinc-400">Omanda Cerli Mandiri</p>
      </div>

      <button
        onClick={() => {
          setGoing(true)
          router.push('/login')
        }}
        disabled={going}
        className="tactile h-12 w-full rounded-xl bg-[var(--brand-solid)] text-base font-semibold text-white shadow-[0_8px_24px_rgba(14,122,88,0.35)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
      >
        {going ? 'Membuka…' : 'Masuk'}
      </button>
    </div>
  )
}
