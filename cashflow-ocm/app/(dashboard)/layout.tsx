export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { DesktopSidebar } from '@/components/desktop-sidebar'
import { BottomNav } from '@/components/bottom-nav'
import { ScrollShell } from '@/components/scroll-shell'
import { SwipeNavigator } from '@/components/swipe-navigator'
import { parsePerms } from '@/lib/nav-routes'

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
  const perms = parsePerms((session.user as any).permissions)

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Sidebar — desktop only, collapsible */}
      <DesktopSidebar user={session.user} isOwner={isOwner} />

      {/* Main content + mobile header. SwipeNavigator: geser kiri=back, kanan=forward */}
      <ScrollShell>
        <SwipeNavigator>{children}</SwipeNavigator>
      </ScrollShell>

      {/* Bottom nav — mobile only */}
      <BottomNav isOwner={isOwner} user={session.user} />
    </div>
  )
}
