import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

/**
 * Pastikan ada sesi login. Mengembalikan currentUser untuk SettingsClient.
 */
export async function requireSettingsSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  return {
    session,
    currentUser: {
      id: session.user.id,
      role: (session.user as { role?: string }).role || 'admin',
    },
  }
}
