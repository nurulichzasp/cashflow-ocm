'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth-client'
import { ProfileDialog } from '@/components/profile-dialog'
import { getSettingsGroups } from '@/lib/settings-groups'
import { fotoUrl } from '@/lib/foto-url'
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

// Baris list datar ala Settings Instagram: ikon tipis tanpa kotak + label + chevron.
const rowCls = 'flex w-full items-center gap-3.5 py-3 text-left transition-opacity active:opacity-60'
const iconCls = 'h-[22px] w-[22px] shrink-0 text-stone-500 dark:text-zinc-400'
const labelCls = 'min-w-0 flex-1 text-[15px] font-medium text-stone-900 dark:text-zinc-100'
const chevronCls = 'h-[17px] w-[17px] shrink-0 text-stone-300 dark:text-stone-600'
const dividerCls = 'divide-y divide-black/[0.05] dark:divide-white/[0.06]'

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
    <div className="mx-auto max-w-2xl space-y-7">
      {/* Kartu profil — dirampingkan */}
      <div className="surface flex flex-col items-center px-5 py-5 text-center">
        {user.image ? (
          <img src={fotoUrl(user.image)} alt="Avatar" width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-full bg-stone-200 text-xl font-bold text-stone-600 dark:bg-white/[0.08] dark:text-zinc-200">
            {getInitials(displayName)}
          </div>
        )}
        <p className="mt-2.5 text-base font-bold tracking-tight text-stone-900 dark:text-zinc-50">{displayName}</p>
        <p className="text-[13px] text-stone-500 dark:text-zinc-400">{user.email}</p>
        <ProfileDialog user={user}>
          <button className="mt-3 rounded-full border border-stone-300 px-4 py-1.5 text-[13px] font-semibold text-stone-700 transition-colors hover:bg-stone-100 dark:border-white/[0.12] dark:text-zinc-200 dark:hover:bg-white/[0.06]">
            Edit profil
          </button>
        </ProfileDialog>
      </div>

      {/* Akun */}
      <section className="space-y-1">
        <h2 className="px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">Akun</h2>
        <div className={dividerCls}>
          <ProfileDialog user={user}>
            <button className={rowCls}>
              <User className={iconCls} strokeWidth={1.75} />
              <span className={labelCls}>Informasi pribadi</span>
              <ChevronRight className={chevronCls} />
            </button>
          </ProfileDialog>
        </div>
      </section>

      {/* Grup pengaturan — link ke /pengaturan/* yang sudah ada */}
      {groups.map((group) => (
        <section key={group.label} className="space-y-1">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">{group.label}</h2>
          <div className={dividerCls}>
            {group.items.map(({ href, icon: Icon, title }) => (
              <Link key={href} href={href} className={rowCls}>
                <Icon className={iconCls} strokeWidth={1.75} />
                <span className={labelCls}>{title}</span>
                <ChevronRight className={chevronCls} />
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* Keluar — destruktif, hemat */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 py-3.5 text-[15px] font-semibold text-crit transition-opacity active:opacity-60"
      >
        <LogOut className="h-[18px] w-[18px]" />
        Keluar
      </button>
    </div>
  )
}
