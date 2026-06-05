'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth-client'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await signIn.email({ email: form.email, password: form.password })
      if (result?.error) {
        toast.error(result.error.message ?? 'Email atau password salah')
        setLoading(false)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.')
      setLoading(false)
    }
  }

  /* Reusable inline style helpers */
  const inputStyle = {
    background: '#242424',
    border: '1px solid #2c2c2c',
    color: '#f5f5f5',
  } as React.CSSProperties

  function focusIn(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = '#FC6E20'
  }
  function focusOut(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = '#2c2c2c'
  }

  return (
    <div className="min-h-[100dvh] flex" style={{ background: '#1a1a1a' }}>

      {/* ── Left — brand panel (desktop only) ── */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12 shrink-0"
        style={{ background: '#FC6E20' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-black/15 flex items-center justify-center text-white font-bold text-[11px] tracking-wide">
            OCM
          </div>
          <span className="text-white/70 text-sm font-medium tracking-wide">CV OCM Cashflow</span>
        </div>

        {/* Hero copy */}
        <div>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-5">
            Sistem Manajemen Keuangan
          </p>
          <h1 className="text-4xl font-bold text-white leading-[1.2] tracking-tight">
            Cashflow sawit<br />dalam genggaman.
          </h1>
          <p className="text-white/50 mt-4 text-sm leading-relaxed max-w-xs">
            Catat pembelian dari peron, penjualan ke BGA, dan pantau kas CV OCM — terpusat dan real-time.
          </p>

          {/* Stats strip */}
          <div className="flex items-center gap-8 mt-10 pt-8 border-t border-white/15">
            {[
              { v: '16+', l: 'Peron' },
              { v: '8',   l: 'Modul' },
              { v: '✓',   l: 'Real-time' },
            ].map((s) => (
              <div key={s.l}>
                <p className="text-2xl font-bold text-white leading-none">{s.v}</p>
                <p className="text-xs text-white/40 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/25 text-xs">Supplier TBS &amp; BRDL — PKS PT. BGA</p>
      </div>

      {/* ── Right — form ── */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-[320px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-12">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-[11px] tracking-wide"
              style={{ background: '#FC6E20' }}
            >
              OCM
            </div>
            <span className="font-semibold text-sm" style={{ color: '#f5f5f5' }}>
              CV OCM Cashflow
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-[1.625rem] font-bold leading-tight tracking-tight" style={{ color: '#f5f5f5' }}>
            Selamat datang
          </h2>
          <p className="text-sm mt-1.5 mb-8" style={{ color: '#6b6b6b' }}>
            Masuk untuk melanjutkan ke dashboard.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-[10px] font-bold uppercase tracking-widest block"
                style={{ color: '#6b6b6b' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
                className="w-full h-11 rounded-xl px-4 text-sm outline-none transition-colors duration-150 placeholder:text-[#3a3a3a]"
                style={inputStyle}
                onFocus={focusIn}
                onBlur={focusOut}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-[10px] font-bold uppercase tracking-widest block"
                style={{ color: '#6b6b6b' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                  className="w-full h-11 rounded-xl px-4 pr-11 text-sm outline-none transition-colors duration-150 placeholder:text-[#3a3a3a]"
                  style={inputStyle}
                  onFocus={focusIn}
                  onBlur={focusOut}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors duration-150"
                  style={{ color: '#525252' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#9b9b9b' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#525252' }}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl font-semibold text-sm text-white transition-all duration-150 flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                style={{ background: '#FC6E20' }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#e05d10' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#FC6E20' }}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                    Memproses...
                  </>
                ) : 'Masuk'}
              </button>
            </div>
          </form>

          <p className="text-center text-[11px] mt-10" style={{ color: '#3a3a3a' }}>
            Supplier TBS &amp; BRDL — PKS PT. BGA
          </p>
        </div>
      </div>
    </div>
  )
}
