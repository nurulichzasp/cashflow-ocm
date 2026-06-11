export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { ChevronRight } from 'lucide-react'
import { getSettingsGroups } from '@/lib/settings-groups'

export default async function PengaturanPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  const isOwner = (session.user as { role?: string }).role === 'owner'

  const groups = getSettingsGroups(isOwner)

  return (
    <div className="space-y-7 max-w-3xl md:max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-zinc-50">Pengaturan</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Kelola perusahaan, pengguna, dan preferensi aplikasi.
        </p>
      </div>

      {/* Desktop: grup tersusun 2 kolom (isi lebar, tak sprawl ke bawah). Mobile: 1 kolom. */}
      <div className="space-y-7 md:grid md:grid-cols-2 md:items-start md:gap-x-5 md:gap-y-7 md:space-y-0">
      {groups.map((group) => (
        <section key={group.label} className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            {group.label}
          </h2>
          <div className="surface overflow-hidden p-0 divide-y divide-stone-100 dark:divide-white/[0.06]">
            {group.items.map(({ href, icon: Icon, title }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-stone-50 dark:hover:bg-white/[0.03] active:bg-stone-100 dark:active:bg-white/[0.05]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-600 dark:bg-white/[0.06] dark:text-stone-300">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-stone-900 dark:text-zinc-100">{title}</span>
                <ChevronRight className="h-[18px] w-[18px] shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-500 dark:text-stone-600 dark:group-hover:text-stone-400" />
              </Link>
            ))}
          </div>
        </section>
      ))}
      </div>
    </div>
  )
}
