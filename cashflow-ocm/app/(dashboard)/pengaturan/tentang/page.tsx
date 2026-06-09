export const dynamic = 'force-dynamic'

import { Leaf } from 'lucide-react'
import { SettingHeader } from '../_components/setting-header'
import { requireSettingsSession } from '../_components/require-session'

export default async function TentangPage() {
  await requireSettingsSession()

  const rows = [
    { label: 'Aplikasi', value: 'Cashflow CV OCM' },
    { label: 'Versi', value: '0.1.0' },
    { label: 'Platform', value: 'Next.js 16 · React 19' },
    { label: 'Basis Data', value: 'Turso (libSQL) · Drizzle ORM' },
    { label: 'Lisensi', value: 'Internal — CV OCM' },
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      <SettingHeader title="Tentang Aplikasi" description="Informasi versi dan teknologi." />

      {/* Identitas aplikasi */}
      <div className="surface flex items-center gap-4 p-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)]">
          <Leaf className="h-7 w-7" />
        </span>
        <div>
          <p className="text-lg font-bold tracking-tight text-stone-900 dark:text-zinc-50">Cashflow CV OCM</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">Manajemen keuangan supplier sawit</p>
        </div>
      </div>

      {/* Detail teknis */}
      <div className="surface overflow-hidden p-0 divide-y divide-stone-100 dark:divide-white/[0.06]">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm text-stone-500 dark:text-stone-400">{label}</span>
            <span className="text-sm font-medium text-stone-900 dark:text-zinc-100 text-right">{value}</span>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-stone-400 dark:text-stone-500">
        © 2026 CV OCM · Dibuat untuk operasional internal.
      </p>
    </div>
  )
}
