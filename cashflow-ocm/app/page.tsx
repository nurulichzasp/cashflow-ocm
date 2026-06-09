import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'CV OCM Cashflow — Omanda Cerli Mandiri',
  description:
    'Sistem keuangan CV Omanda Cerli Mandiri — supplier TBS & BRDL ke PKS PT. BGA. Pembelian, penjualan, peron, kas, dan laporan dalam satu aplikasi.',
}

/**
 * Cover/landing publik di `/` — "muka depan" omandacerli.com.
 * Tombol Masuk → /dashboard: kalau sudah login langsung buka app (tanpa login
 * ulang), kalau belum, gate di (dashboard)/layout.tsx mengalihkan ke /login.
 * Hijau dipakai hemat (monogram + aksi utama), selaras sistem netral app.
 */
export default function Home() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#0A0A0A] text-zinc-100">
      {/* Glow hijau sawit dari atas — kedalaman + sentuhan brand, halus */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -top-48 h-[40rem] w-[52rem] -translate-x-1/2 rounded-full opacity-[0.11] blur-3xl"
        style={{ background: 'radial-gradient(circle, #0E7A57 0%, transparent 70%)' }}
      />
      {/* Garis halus di tepi atas layar — detail presisi */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />

      {/* Header — brand kiri, Masuk sekunder kanan */}
      <header className="relative z-10 flex h-16 items-center justify-between px-6 sm:h-20 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.14] bg-[var(--brand-solid)] text-[11px] font-bold tracking-wide text-white shadow-[0_4px_14px_rgba(14,122,87,0.45)]">
            OCM
          </div>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-zinc-100">CV OCM</span>
            <span className="mt-0.5 text-[9px] uppercase tracking-[0.28em] text-zinc-500">Cashflow</span>
          </span>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.12] px-4 text-[13px] font-semibold text-zinc-200 transition-colors hover:border-white/25 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          Masuk
        </Link>
      </header>

      {/* Hero */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-zinc-500">
          CV Omanda Cerli Mandiri
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-zinc-50 sm:text-5xl md:text-6xl">
          Cashflow sawit,
          <br className="hidden sm:block" /> terkendali penuh.
        </h1>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-400 sm:text-base">
          Pembelian, penjualan, peron, kas, sampai laporan keuangan — semua dalam
          satu sistem. Supplier TBS &amp; BRDL ke PKS PT. BGA.
        </p>
        <div className="mt-9">
          <Link
            href="/dashboard"
            className="group inline-flex h-12 items-center gap-2.5 rounded-xl bg-[var(--brand-solid)] px-7 text-sm font-semibold tracking-tight text-white shadow-[0_10px_34px_rgba(14,122,87,0.45)] transition-all hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
          >
            Masuk ke aplikasi
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 px-6 pb-7 text-center">
        <p className="text-[11px] text-zinc-600">
          CV Omanda Cerli Mandiri &middot; Supplier TBS &amp; BRDL ke PKS PT. BGA
        </p>
      </footer>
    </main>
  )
}
