import 'server-only'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import {
  hasModulePermission,
  requireUserPermission,
  type ModulePermission,
  type Permissions,
} from '@/lib/permissions'

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Tidak terautentikasi')
  return session
}

export async function requireOwner(message = 'Hanya owner yang dapat melakukan aksi ini') {
  const session = await requireSession()
  if ((session.user.role ?? '').toLowerCase() !== 'owner') throw new Error(message)
  return session
}

export async function requireModuleSession(module: ModulePermission) {
  const session = await requireSession()
  if (!hasModulePermission(session.user, module)) {
    throw new Error('Anda tidak memiliki akses ke modul ini')
  }
  return session
}

export async function requireModuleAction(
  module: ModulePermission,
  permission: keyof Permissions,
) {
  const session = await requireModuleSession(module)
  requireUserPermission(session.user, permission, module)
  return session
}
