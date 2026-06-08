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

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center p-6 bg-[#0A0A0A] overflow-hidden">
      {/* Subtle ambient radial accents — premium feel */}
      <div
        aria-hidden
        className="absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full opacity-[0.10] blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -left-32 h-[30rem] w-[30rem] rounded-full opacity-[0.08] blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #10B981 0%, transparent 70%)' }}
      />

      {/* Centered glass card */}
      <div className="relative w-full max-w-[400px] rounded-2xl p-8 sm:p-10 bg-white/[0.025] backdrop-blur-xl border border-white/[0.07] shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
        {/* Brand mark */}
        <div className="flex items-center gap-2.5 mb-9">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center text-zinc-200 font-bold text-[11px] tracking-wide bg-white/[0.06] border border-white/[0.08]">
            OCM
          </div>
          <span className="font-semibold text-sm text-zinc-100 tracking-tight">
            CV OCM Cashflow
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-zinc-50">
          Selamat datang
        </h2>
        <p className="text-sm text-zinc-500 mt-1.5 mb-8">
          Masuk untuk melanjutkan ke dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-[11px] font-semibold uppercase tracking-widest block text-zinc-500"
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
              className="w-full h-11 rounded-xl px-4 text-sm outline-none transition-all duration-200 bg-white/[0.025] border border-white/[0.08] text-zinc-100 placeholder:text-zinc-600 focus:border-white/[0.20] focus:bg-white/[0.04]"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-[11px] font-semibold uppercase tracking-widest block text-zinc-500"
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
                className="w-full h-11 rounded-xl px-4 pr-11 text-sm outline-none transition-all duration-200 bg-white/[0.025] border border-white/[0.08] text-zinc-100 placeholder:text-zinc-600 focus:border-white/[0.20] focus:bg-white/[0.04]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl font-semibold text-sm tracking-tight transition-all duration-200 flex items-center justify-center gap-2.5 bg-white text-stone-900 hover:bg-zinc-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 shadow-[0_8px_24px_rgba(255,255,255,0.08)]"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-stone-900/25 border-t-stone-900 animate-spin" />
                  Memproses...
                </>
              ) : 'Masuk'}
            </button>
          </div>
        </form>

        <p className="text-center text-[11px] mt-8 text-zinc-600">
          Supplier TBS &amp; BRDL
        </p>
      </div>
    </div>
  )
}
