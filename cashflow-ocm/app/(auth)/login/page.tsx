'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Leaf } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

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
        style={{ background: 'linear-gradient(145deg, #C2410C 0%, #EA580C 45%, #D97706 100%)' }}
      >
        {/* Subtle geometric overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 80%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white font-bold text-sm backdrop-blur-sm">
            OCM
          </div>
          <span className="font-semibold text-white text-sm tracking-wide">
            CV OCM Cashflow
          </span>
        </div>

        {/* Hero text */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-6">
            <Leaf className="h-5 w-5 text-orange-200" />
            <span className="text-orange-200 text-sm font-medium">Sistem Manajemen Keuangan</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
            Cashflow sawit
            <br />
            dalam genggaman.
          </h1>
          <p className="text-orange-100 mt-4 text-base leading-relaxed max-w-xs">
            Catat pembelian dari peron, penjualan ke BGA, dan pantau kas CV OCM — semua terpusat dan real-time.
          </p>
        </div>

        {/* Footer */}
        <div className="relative text-orange-300 text-xs">
          Supplier TBS &amp; BRDL ke PKS PT. BGA
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-stone-50 p-6 lg:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white font-bold text-sm">
              OCM
            </div>
            <span className="font-semibold text-stone-900">CV OCM Cashflow</span>
          </div>

          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Selamat datang</h2>
          <p className="text-stone-500 text-sm mt-1 mb-8">
            Masuk untuk melanjutkan ke dashboard.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-stone-700"
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
                className="h-10 border-stone-300 bg-white focus:border-orange-500 focus:ring-orange-100 text-stone-900 placeholder:text-stone-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-stone-700"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                required
                autoComplete="current-password"
                className="h-10 border-stone-300 bg-white focus:border-orange-500 focus:ring-orange-100 text-stone-900 placeholder:text-stone-400"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
