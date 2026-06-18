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
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn.email({ email: form.email, password: form.password })
      if (result?.error) {
        const msg = result.error.message ?? 'Email atau password salah'
        setError(msg)
        toast.error(msg)
        setLoading(false)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      const msg = 'Terjadi kesalahan. Periksa koneksi lalu coba lagi.'
      setError(msg)
      toast.error(msg)
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center p-6 bg-[var(--brand-screen-bg)] overflow-hidden">
      {/* Satu sumber cahaya netral dari atas — kedalaman tanpa warna dekoratif
          (selaras palet netral; menggantikan blur indigo/emerald yang terlalu samar). */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -top-44 h-[34rem] w-[44rem] -translate-x-1/2 rounded-full opacity-[0.07] blur-3xl"
        style={{ background: 'radial-gradient(circle, #FFFFFF 0%, transparent 70%)' }}
      />

      {/* Centered glass card */}
      <div className="relative w-full max-w-[400px] rounded-2xl p-8 sm:p-10 bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
        {/* Highlight tipis di tepi atas kartu — detail kaca yang presisi */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />

        {/* Brand mark */}
        <div className="flex items-center gap-2.5 mb-9">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-[11px] tracking-wide bg-[var(--brand-solid)] border border-white/[0.14] shadow-[0_4px_14px_rgba(14,122,87,0.45)]">
            OCM
          </div>
          <span className="flex flex-col leading-tight">
            <span className="font-semibold text-sm text-zinc-100 tracking-tight">CV OCM</span>
            <span className="text-[9px] uppercase tracking-[0.28em] text-zinc-500 mt-0.5">Cashflow</span>
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-zinc-50">
          Selamat datang
        </h2>
        <p className="text-sm text-zinc-400 mt-1.5 mb-8">
          Masuk untuk melanjutkan ke dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-[11px] font-semibold uppercase tracking-widest block text-zinc-400"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="nama@email.com"
              value={form.email}
              onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); if (error) setError('') }}
              required
              autoComplete="email"
              aria-invalid={!!error}
              className="login-input w-full h-11 rounded-xl px-4 text-sm text-zinc-100 placeholder:text-zinc-500 bg-white/[0.03] border border-white/[0.10] outline-none transition-colors duration-200 hover:border-white/[0.16] focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/15"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-[11px] font-semibold uppercase tracking-widest block text-zinc-400"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Kata sandi"
                value={form.password}
                onChange={(e) => { setForm((f) => ({ ...f, password: e.target.value })); if (error) setError('') }}
                required
                autoComplete="current-password"
                aria-invalid={!!error}
                className="login-input w-full h-11 rounded-xl px-4 pr-12 text-sm text-zinc-100 placeholder:text-zinc-500 bg-white/[0.03] border border-white/[0.10] outline-none transition-colors duration-200 hover:border-white/[0.16] focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/15"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Pesan error inline — persisten (toast bisa hilang di sinyal buruk) */}
          {error && (
            <p role="alert" aria-live="polite" className="text-xs text-red-300">
              {error}
            </p>
          )}

          {/* Submit */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl font-semibold text-sm tracking-tight transition-all duration-200 flex items-center justify-center gap-2.5 bg-[var(--brand-solid)] text-white hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 shadow-[0_8px_28px_rgba(14,122,87,0.45)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-screen-bg)]"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Memproses...
                </>
              ) : 'Masuk'}
            </button>
          </div>
        </form>

        <p className="text-center text-[11px] mt-8 text-zinc-400">
          Supplier TBS &amp; Brondolan
        </p>
      </div>
    </div>
  )
}
