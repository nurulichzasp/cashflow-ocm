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

  const inputStyle = {
    background: '#1E1E1E',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#F3F4F6',
  } as React.CSSProperties

  function focusIn(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = '#D97757'
  }
  function focusOut(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
  }

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center p-6"
      style={{ background: '#1E1E1E' }}
    >
      {/* Centered card */}
      <div
        className="w-full max-w-[380px] rounded-2xl p-8 sm:p-10"
        style={{
          background: '#28282B',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Brand mark */}
        <div className="flex items-center gap-2.5 mb-8">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-xs tracking-wide"
            style={{ background: '#D97757' }}
          >
            OCM
          </div>
          <span className="font-semibold text-sm" style={{ color: '#F3F4F6' }}>
            CV OCM Cashflow
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold leading-tight tracking-tight" style={{ color: '#F3F4F6' }}>
          Selamat datang
        </h2>
        <p className="text-sm mt-1.5 mb-8" style={{ color: '#9CA3AF' }}>
          Masuk untuk melanjutkan ke dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-[11px] font-semibold uppercase tracking-widest block"
              style={{ color: '#9CA3AF' }}
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
              className="w-full h-11 rounded-xl px-4 text-sm outline-none transition-colors duration-150 placeholder:text-[#5b5b5b]"
              style={inputStyle}
              onFocus={focusIn}
              onBlur={focusOut}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-[11px] font-semibold uppercase tracking-widest block"
              style={{ color: '#9CA3AF' }}
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
                className="w-full h-11 rounded-xl px-4 pr-11 text-sm outline-none transition-colors duration-150 placeholder:text-[#5b5b5b]"
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
                style={{ color: '#6B7280' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#9CA3AF' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#6B7280' }}
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
              style={{ background: '#D97757' }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#c8654a' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#D97757' }}
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

        <p className="text-center text-[11px] mt-8" style={{ color: '#5b5b5b' }}>
          Supplier TBS &amp; BRDL — PKS PT. BGA
        </p>
      </div>
    </div>
  )
}
