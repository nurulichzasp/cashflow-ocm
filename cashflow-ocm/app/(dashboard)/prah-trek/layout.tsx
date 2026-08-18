import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export default async function PrahTrekLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  if ((session.user.role ?? '').toLowerCase() !== 'owner') redirect('/dashboard')
  return children
}
