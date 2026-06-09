export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { SettingsClient } from '../settings-client'
import { SettingHeader } from '../_components/setting-header'
import { requireSettingsSession } from '../_components/require-session'

export default async function PenggunaPage() {
  const { currentUser } = await requireSettingsSession()
  if (currentUser.role !== 'owner') redirect('/pengaturan')

  const dbUsers = await db.select().from(user).orderBy(asc(user.name))
  const initialUsers = dbUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    image: u.image || null,
  }))

  return (
    <div className="space-y-6 max-w-5xl">
      <SettingHeader
        title="Manajemen Pengguna"
        description="Tambah pengguna dan atur hak akses tiap modul."
      />
      <SettingsClient currentUser={currentUser} initialUsers={initialUsers} section="users" />
    </div>
  )
}
