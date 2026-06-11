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
    <div className="mx-auto max-w-2xl space-y-7 md:max-w-5xl">
      {/* H1 hanya desktop — di mobile judul sudah ada di header (back + "Pengaturan"). */}
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-zinc-50">Pengaturan</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Kelola perusahaan, pengguna, dan preferensi aplikasi.
        </p>
      </div>

      {/* List datar ala Settings Instagram: ikon tipis tanpa kotak, hairline. Desktop: 2 kolom. */}
      <div className="space-y-7 md:grid md:grid-cols-2 md:items-start md:gap-x-8 md:gap-y-7 md:space-y-0">
      {groups.map((group) => (
        <section key={group.label} className="space-y-1">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            {group.label}
          </h2>
          <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
            {group.items.map(({ href, icon: Icon, title }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3.5 py-3 transition-opacity active:opacity-60"
              >
                <Icon className="h-[22px] w-[22px] shrink-0 text-stone-500 dark:text-zinc-400" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 text-[15px] font-medium text-stone-900 dark:text-zinc-100">{title}</span>
                <ChevronRight className="h-[17px] w-[17px] shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 dark:text-stone-600" />
              </Link>
            ))}
          </div>
        </section>
      ))}
      </div>
    </div>
  )
}
