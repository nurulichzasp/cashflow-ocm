export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'
import { SettingsClient } from './settings-client'

export default async function PengaturanPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  // Query all users from the database for the User Management tab
  const dbUsers = await db.select().from(user).orderBy(asc(user.name))

  const initialUsers = dbUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    image: u.image || null,
    permissions: u.permissions || null,
  }))

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Pengaturan Sistem</h1>
        <p className="text-muted-foreground text-sm">
          Kelola profil perusahaan, kontrol akses pengguna, printer kasir, dan cadangan data.
        </p>
      </div>

      <SettingsClient
        currentUser={{
          id: session.user.id,
          role: session.user.role || 'admin',
        }}
        initialUsers={initialUsers}
      />
    </div>
  )
}
