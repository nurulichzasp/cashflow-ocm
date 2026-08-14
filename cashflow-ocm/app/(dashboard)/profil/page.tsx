export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { ProfilClient } from './profil-client'

export default async function ProfilPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  const isOwner = (session.user as { role?: string }).role === 'owner'

  return <ProfilClient user={{ ...session.user, role: session.user.role ?? 'viewer' }} isOwner={isOwner} />
}
