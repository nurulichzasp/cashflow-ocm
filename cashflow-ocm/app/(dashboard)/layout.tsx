export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { Sidebar, MobileSidebar } from '@/components/sidebar'

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
      {/* Sidebar desktop */}
      <div className="hidden md:flex">
        <Sidebar userName={session.user.name} isOwner={isOwner} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-stone-200/80 bg-white/95 backdrop-blur-sm px-4 md:hidden sticky top-0 z-10">
          <MobileSidebar userName={session.user.name} isOwner={isOwner} />
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-orange-600 text-white text-[9px] font-bold shrink-0">
              OCM
            </div>
            <span className="font-semibold text-sm text-stone-900">CV OCM Cashflow</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-stone-50 p-4 md:p-6">
          <div className="app-container">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
