export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/sidebar'
import { BottomNav } from '@/components/bottom-nav'
import { ScrollShell } from '@/components/scroll-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect('/login')
  }

  const isOwner = session.user.role === 'owner'

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar userName={session.user.name} isOwner={isOwner} />
      </div>

      {/* Main content + mobile header */}
      <ScrollShell>{children}</ScrollShell>

      {/* Bottom nav — mobile only */}
      <BottomNav isOwner={isOwner} userName={session.user.name} />
    </div>
  )
}
