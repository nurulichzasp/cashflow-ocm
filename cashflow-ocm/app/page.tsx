export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { WelcomeScreen } from '@/components/welcome-screen'

/**
 * Root — momen "buka app". Cek sesi di server:
 *   sudah login → /dashboard
 *   belum login → WelcomeScreen (BUKAN langsung form /login)
 * Saat cek sesi berjalan, app/loading.tsx (splash) tampil otomatis.
 */
export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect('/dashboard')
  return <WelcomeScreen />
}
