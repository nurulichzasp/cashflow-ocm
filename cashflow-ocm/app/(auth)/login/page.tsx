'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth-client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Leaf, Eye, EyeOff, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40)
    return () => clearTimeout(t)
  }, [])

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setMouse({ x, y })
  }

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
        setLoading(false)
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 750)
      }
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.')
      setLoading(false)
    }
  }

  /* Helper: stagger-in style per elemen */
  function fadeUp(delay: number) {
    return {
      className: cn(
        'transition-all duration-700',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      ),
      style: {
        transitionDelay: mounted ? `${delay}ms` : '0ms',
        transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
      } as React.CSSProperties,
    }
  }

  return (
    <div className="min-h-[100dvh] flex overflow-hidden">

      {/* ─── Left panel — 3D brand ─── */}
      <div
        ref={panelRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setMouse({ x: 0, y: 0 })}
        className={cn(
          'hidden lg:block lg:w-[45%] relative overflow-hidden select-none',
          'transition-all duration-1000',
          mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-16'
        )}
        style={{
          background: 'linear-gradient(150deg, #7C2D12 0%, #C2410C 40%, #EA580C 70%, #D97706 100%)',
          transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
          perspective: '900px',
        }}
      >
        {/* Inner 3D tilt container */}
        <div
          className="absolute inset-0 flex flex-col justify-between p-12"
          style={{
            transform: `rotateX(${-mouse.y * 5}deg) rotateY(${mouse.x * 5}deg)`,
            transition: 'transform 0.18s ease-out',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Parallax decorative circles — different depths */}
          <div
            className="absolute -right-32 -top-32 w-96 h-96 rounded-full border border-white/10 pointer-events-none"
            style={{
              transform: `translate3d(${mouse.x * -35}px, ${mouse.y * -35}px, 40px)`,
              transition: 'transform 0.22s ease-out',
            }}
          />
          <div
            className="absolute -right-20 -top-20 w-72 h-72 rounded-full border border-white/[0.06] pointer-events-none"
            style={{
              transform: `translate3d(${mouse.x * -22}px, ${mouse.y * -22}px, 20px)`,
              transition: 'transform 0.22s ease-out',
            }}
          />
          <div
            className="absolute -left-24 -bottom-24 w-80 h-80 rounded-full bg-white/[0.04] pointer-events-none"
            style={{
              transform: `translate3d(${mouse.x * 28}px, ${mouse.y * 28}px, 28px)`,
              transition: 'transform 0.22s ease-out',
            }}
          />
          <div
            className="absolute left-8 bottom-32 w-2.5 h-2.5 rounded-full bg-white/25 pointer-events-none"
            style={{
              transform: `translate3d(${mouse.x * -50}px, ${mouse.y * -50}px, 55px)`,
              transition: 'transform 0.28s ease-out',
            }}
          />
          <div
            className="absolute right-24 top-36 w-2 h-2 rounded-full bg-white/20 pointer-events-none"
            style={{
              transform: `translate3d(${mouse.x * 42}px, ${mouse.y * 42}px, 45px)`,
              transition: 'transform 0.28s ease-out',
            }}
          />
          <div
            className="absolute right-40 bottom-48 w-1.5 h-1.5 rounded-full bg-white/15 pointer-events-none"
            style={{
              transform: `translate3d(${mouse.x * -30}px, ${mouse.y * 30}px, 30px)`,
              transition: 'transform 0.25s ease-out',
            }}
          />

          {/* Logo — floats forward */}
          <div
            className="relative flex items-center gap-3"
            style={{ transform: 'translateZ(25px)' }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white font-bold text-xs backdrop-blur-sm border border-white/20">
              OCM
            </div>
            <span className="font-medium text-white/75 text-sm tracking-wide">
              CV OCM Cashflow
            </span>
          </div>

          {/* Hero text — floats forward */}
          <div
            className="relative"
            style={{ transform: 'translateZ(18px)' }}
          >
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
          <div
            className="relative text-white/35 text-xs font-medium"
            style={{ transform: 'translateZ(10px)' }}
          >
            Supplier TBS &amp; BRDL ke PKS PT. BGA
          </div>
        </div>
      </div>

      {/* ─── Right panel — stagger-in form ─── */}
      <div className="flex-1 flex items-center justify-center bg-stone-50 p-6 lg:p-16 overflow-hidden">
        <div className="w-full max-w-[360px]">

          {/* Mobile logo */}
          <div
            {...fadeUp(0)}
            className={cn('lg:hidden mb-10 flex items-center gap-2.5', fadeUp(0).className)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white font-bold text-xs shadow-sm shadow-orange-600/30">
              OCM
            </div>
            <span className="font-semibold text-stone-800 text-sm">CV OCM Cashflow</span>
          </div>

          {/* Heading */}
          <div {...fadeUp(80)}>
            <h2 className="text-[1.75rem] font-bold text-stone-900 tracking-tight leading-none">
              Selamat datang
            </h2>
            <p className="text-stone-400 text-sm mt-2.5 mb-9 leading-relaxed">
              Masuk untuk melanjutkan ke dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div {...fadeUp(180)} className={cn('space-y-2', fadeUp(180).className)}>
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

            {/* Password */}
            <div {...fadeUp(260)} className={cn('space-y-2', fadeUp(260).className)}>
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
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <div {...fadeUp(340)} className={cn('pt-2', fadeUp(340).className)}>
              <button
                type="submit"
                disabled={loading || success}
                className={cn(
                  'w-full h-11 rounded-xl font-semibold text-sm transition-all duration-300',
                  'flex items-center justify-center gap-2.5 shadow-sm',
                  'disabled:pointer-events-none',
                  success
                    ? 'bg-green-500 text-white shadow-green-500/20 scale-[0.99]'
                    : 'bg-orange-600 hover:bg-orange-700 active:scale-[0.97] text-white shadow-orange-600/20'
                )}
              >
                {success ? (
                  <span className="flex items-center gap-2 login-check-pop">
                    <Check className="h-5 w-5" strokeWidth={2.5} />
                    Berhasil!
                  </span>
                ) : loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Masuk'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
