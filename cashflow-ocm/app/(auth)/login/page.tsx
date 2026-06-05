'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Leaf, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await signIn.email({
        email: form.email,
        password: form.password,
      })
      if (result?.error) {
        toast.error(result.error.message ?? 'Email atau password salah')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex">
      {/* Left panel — brand */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(150deg, #7C2D12 0%, #C2410C 40%, #EA580C 70%, #D97706 100%)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full border border-white/10" />
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full border border-white/[0.06]" />
        <div className="absolute -left-24 -bottom-24 w-80 h-80 rounded-full bg-white/[0.04]" />
        <div className="absolute left-8 bottom-32 w-2 h-2 rounded-full bg-white/20" />
        <div className="absolute right-24 top-40 w-1.5 h-1.5 rounded-full bg-white/20" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white font-bold text-xs backdrop-blur-sm border border-white/20">
            OCM
          </div>
          <span className="font-medium text-white/75 text-sm tracking-wide">
            CV OCM Cashflow
          </span>
        </div>

        {/* Hero text */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-white/10 border border-white/15">
            <Leaf className="h-3.5 w-3.5 text-orange-200" />
            <span className="text-orange-100/90 text-xs font-medium">Sistem Manajemen Keuangan</span>
          </div>
          <h1 className="text-[2.75rem] font-bold text-white leading-[1.15] tracking-tight">
            Cashflow sawit
            <br />
            dalam genggaman.
          </h1>
          <p className="text-orange-100/60 mt-5 text-sm leading-relaxed max-w-xs">
            Catat pembelian dari peron, penjualan ke BGA, dan pantau kas CV OCM — semua terpusat dan real-time.
          </p>
        </div>

        {/* Footer */}
        <div className="relative text-white/35 text-xs font-medium">
          Supplier TBS &amp; BRDL ke PKS PT. BGA
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-stone-50 p-6 lg:p-16">
        <div className="w-full max-w-[360px]">

          {/* Mobile logo */}
          <div className="lg:hidden mb-10 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white font-bold text-xs shadow-sm shadow-orange-600/30">
              OCM
            </div>
            <span className="font-semibold text-stone-800 text-sm">CV OCM Cashflow</span>
          </div>

          <h2 className="text-[1.75rem] font-bold text-stone-900 tracking-tight leading-none">
            Selamat datang
          </h2>
          <p className="text-stone-400 text-sm mt-2.5 mb-9 leading-relaxed">
            Masuk untuk melanjutkan ke dashboard.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-semibold text-stone-400 uppercase tracking-widest"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={form.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                required
                autoComplete="email"
                className="h-11 border-stone-200 bg-white focus:border-orange-400 text-stone-900 placeholder:text-stone-300 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs font-semibold text-stone-400 uppercase tracking-widest"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  required
                  autoComplete="current-password"
                  className="h-11 border-stone-200 bg-white focus:border-orange-400 text-stone-900 placeholder:text-stone-300 rounded-xl pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-300 hover:text-stone-500 transition-colors rounded-md"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-semibold rounded-xl text-sm shadow-sm shadow-orange-600/20 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2.5">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Memproses...
                  </span>
                ) : 'Masuk'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
