export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import {
  Building2,
  Wallet2,
  TrendingUp,
  Users,
  SunMoon,
  Bell,
  Printer,
  DatabaseBackup,
  Info,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'

type Item = {
  href: string
  icon: LucideIcon
  title: string
  desc: string
}

type Group = {
  label: string
  items: Item[]
}

export default async function PengaturanPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  const isOwner = (session.user as { role?: string }).role === 'owner'

  const groups: Group[] = [
    {
      label: 'Bisnis',
      items: [
        { href: '/pengaturan/perusahaan', icon: Building2, title: 'Profil Perusahaan', desc: 'Nama, alamat, NPWP & ambang transaksi besar' },
        { href: '/pengaturan/pajak', icon: Wallet2, title: 'Pajak & Neraca', desc: 'Tarif PPN, PPh badan & modal awal' },
        { href: '/pengaturan/harga', icon: TrendingUp, title: 'Harga & Margin', desc: 'Selisih jual BGA terbaru per produk' },
      ],
    },
    ...(isOwner
      ? [{
          label: 'Pengguna & Akses',
          items: [
            { href: '/pengaturan/pengguna', icon: Users, title: 'Manajemen Pengguna', desc: 'Tambah pengguna & atur hak akses modul' },
          ],
        }]
      : []),
    {
      label: 'Aplikasi',
      items: [
        { href: '/pengaturan/tampilan', icon: SunMoon, title: 'Tampilan & Tema', desc: 'Mode terang, gelap, atau otomatis' },
        { href: '/pengaturan/notifikasi', icon: Bell, title: 'Notifikasi', desc: 'Status Telegram & laporan otomatis' },
        { href: '/pengaturan/printer', icon: Printer, title: 'Printer Kasir', desc: 'Pengaturan struk thermal 58mm' },
      ],
    },
    {
      label: 'Data & Bantuan',
      items: [
        { href: '/pengaturan/cadangan', icon: DatabaseBackup, title: 'Pencadangan Data', desc: 'Ekspor konfigurasi & zona berbahaya' },
        { href: '/pengaturan/tentang', icon: Info, title: 'Tentang Aplikasi', desc: 'Versi, teknologi & lisensi' },
      ],
    },
  ]

  return (
    <div className="space-y-7 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-zinc-50">Pengaturan</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Kelola perusahaan, pengguna, dan preferensi aplikasi.
        </p>
      </div>

      {groups.map((group) => (
        <section key={group.label} className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            {group.label}
          </h2>
          <div className="surface overflow-hidden p-0 divide-y divide-stone-100 dark:divide-white/[0.06]">
            {group.items.map(({ href, icon: Icon, title, desc }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-stone-50 dark:hover:bg-white/[0.03] active:bg-stone-100 dark:active:bg-white/[0.05]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-600 dark:bg-white/[0.06] dark:text-stone-300">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-stone-900 dark:text-zinc-100">{title}</span>
                  <span className="block truncate text-[13px] text-stone-500 dark:text-stone-400">{desc}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-500 dark:text-stone-600 dark:group-hover:text-stone-400" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
