'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth-client'
import { ProfileDialog } from '@/components/profile-dialog'
import { getSettingsGroups } from '@/lib/settings-groups'
import { fotoUrl } from '@/lib/foto-url'
import { cn } from '@/lib/utils'
import { ChevronRight, User, LogOut } from 'lucide-react'

function getInitials(name?: string | null): string {
  if (!name) return 'U'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

type ProfilUser = {
  id: string
  name: string
  email: string
  image?: string | null
  role: string
  nickname?: string | null
  fullName?: string | null
  personalEmail?: string | null
  phone?: string | null
  address?: string | null
}

export function ProfilClient({ user, isOwner }: { user: ProfilUser; isOwner: boolean }) {
  const router = useRouter()
  const groups = getSettingsGroups(isOwner)
  const displayName = user.nickname || user.name || 'Pengguna'

  async function handleLogout() {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-4">
      {/* Kartu profil */}
      <div className="surface flex flex-col items-center px-6 py-7 text-center">
        {user.image ? (
          <img src={fotoUrl(user.image)} alt="Avatar" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="grid h-20 w-20 place-items-center rounded-full bg-stone-200 text-2xl font-bold text-stone-600 dark:bg-white/[0.08] dark:text-zinc-200">
            {getInitials(displayName)}
          </div>
        )}
        <p className="mt-3 text-lg font-bold tracking-tight text-stone-900 dark:text-zinc-50">{displayName}</p>
        <p className="text-sm text-stone-500 dark:text-zinc-400">{user.email}</p>
        <ProfileDialog user={user}>
          <button className="mt-4 rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 dark:border-white/[0.12] dark:text-zinc-200 dark:hover:bg-white/[0.06]">
            Edit profil
          </button>
        </ProfileDialog>
      </div>

      {/* Akun */}
      <section className="space-y-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">Akun</h2>
        <div className="surface overflow-hidden p-0 divide-y divide-stone-100 dark:divide-white/[0.06]">
          <ProfileDialog user={user}>
            <button className="group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-stone-50 dark:hover:bg-white/[0.03] active:bg-stone-100 dark:active:bg-white/[0.05]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-600 dark:bg-white/[0.06] dark:text-stone-300">
                <User className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium text-stone-900 dark:text-zinc-100">Informasi pribadi</span>
              <ChevronRight className="h-[18px] w-[18px] shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-500 dark:text-stone-600 dark:group-hover:text-stone-400" />
            </button>
          </ProfileDialog>
        </div>
      </section>

      {/* Grup pengaturan — link ke /pengaturan/* yang sudah ada */}
      {groups.map((group) => (
        <section key={group.label} className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">{group.label}</h2>
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

      {/* Keluar — destruktif, hemat */}
      <button
        onClick={handleLogout}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-colors',
          'text-[#DC2626] hover:bg-[#DC2626]/[0.06] dark:text-[#F87171] dark:hover:bg-[#F87171]/[0.08]',
        )}
      >
        <LogOut className="h-4 w-4" />
        Keluar
      </button>
    </div>
  )
}
