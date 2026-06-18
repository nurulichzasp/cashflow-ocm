'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * WelcomeScreen — layar opening sebelum login (bukan langsung form). Latar gelap
 * #0A0A0A (identik dengan /login → transisi mulus), monogram OCM dengan halo
 * emerald lembut, masuk dengan animasi bertahap. CTA "Masuk" → /login dengan
 * spinner loading nyata. Safe-area aman (Dynamic Island + home indicator), 100dvh.
 */
export function WelcomeScreen() {
  const router = useRouter()
  const [going, setGoing] = useState(false)

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col items-center justify-between overflow-hidden bg-[var(--brand-screen-bg)] px-6 text-center"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 2.5rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)',
      }}
    >
      {/* Ambient glow emerald — satu sumber cahaya lembut dari atas (aksen tunggal) */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -top-40 h-[34rem] w-[42rem] -translate-x-1/2 rounded-full opacity-[0.16] blur-[110px]"
        style={{ background: 'radial-gradient(circle, var(--brand-solid) 0%, transparent 70%)' }}
      />
      {/* Vignette bawah tipis — kedalaman tanpa garis */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent"
      />

      {/* Spacer atas (menjaga logo benar-benar di tengah optik) */}
      <div aria-hidden />

      {/* Konten tengah */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo + halo */}
        <div className="relative animate-in fade-in zoom-in-90 duration-700 ease-out">
          <span
            aria-hidden
            className="absolute -inset-5 rounded-[2.25rem] bg-[var(--brand-solid)]/30 blur-2xl"
          />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-[1.65rem] bg-[var(--brand-solid)] text-3xl font-bold tracking-tight text-white border border-white/[0.14] shadow-[0_16px_44px_rgba(14,122,88,0.5)]">
            OCM
          </div>
        </div>

        <h1
          className="mt-9 text-[28px] font-bold tracking-tight text-white animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out"
          style={{ animationDelay: '120ms', animationFillMode: 'backwards' }}
        >
          Cashflow OCM
        </h1>
        <p
          className="mt-2 text-sm font-medium text-zinc-400 animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out"
          style={{ animationDelay: '210ms', animationFillMode: 'backwards' }}
        >
          Omanda Cerli Mandiri
        </p>
      </div>

      {/* Bawah: CTA + tagline */}
      <div
        className="relative z-10 w-full animate-in fade-in slide-in-from-bottom-3 duration-700 ease-out"
        style={{ animationDelay: '340ms', animationFillMode: 'backwards' }}
      >
        <button
          onClick={() => {
            setGoing(true)
            router.push('/login')
          }}
          disabled={going}
          className="tactile flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl border border-white/[0.12] bg-[var(--brand-solid)] text-base font-semibold text-white shadow-[0_12px_32px_rgba(14,122,88,0.4)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:opacity-80"
        >
          {going ? (
            <>
              <span className="h-4 w-4 shrink-0 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Membuka…
            </>
          ) : (
            'Masuk'
          )}
        </button>

        <p className="mt-5 text-[11px] uppercase tracking-[0.28em] text-zinc-600">
          Supplier TBS &amp; BRDL
        </p>
      </div>
    </div>
  )
}
