export type UserRole = 'owner' | 'admin' | 'kasir' | 'akuntan' | 'viewer'

export interface Permissions {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canViewFinance: boolean
  canManageUsers: boolean
  canApproveTransactions: boolean
}

export const moduleKeys = ['pembelian', 'penjualan', 'kas', 'biaya'] as const
export type ModulePermission = (typeof moduleKeys)[number]
export type ModulePermissions = Record<ModulePermission, boolean> & { delete: boolean }

export type PermissionUser = {
  role?: string | null
  permissions?: string | null
}

const defaultModulePermissions: ModulePermissions = {
  pembelian: true,
  penjualan: true,
  kas: true,
  biaya: true,
  delete: false,
}
const deniedModulePermissions: ModulePermissions = {
  pembelian: false,
  penjualan: false,
  kas: false,
  biaya: false,
  delete: false,
}

/** Parse fail-closed: hanya lima boolean yang dikenal yang boleh memengaruhi akses. */
export function parseModulePermissions(raw?: string | null): ModulePermissions {
  if (!raw) return { ...defaultModulePermissions }
  try {
    const candidate: unknown = JSON.parse(raw)
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return { ...deniedModulePermissions }
    }
    const input = candidate as Record<string, unknown>
    const parsed = { ...deniedModulePermissions }
    for (const key of [...moduleKeys, 'delete'] as const) {
      if (typeof input[key] === 'boolean') parsed[key] = input[key]
    }
    return parsed
  } catch {
    return { ...deniedModulePermissions }
  }
}

// Define permission matrix for each role
const permissionMatrix: Record<UserRole, Permissions> = {
  owner: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canViewFinance: true,
    canManageUsers: true,
    canApproveTransactions: true,
  },
  admin: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canViewFinance: true,
    canManageUsers: false,
    canApproveTransactions: true,
  },
  kasir: {
    canCreate: true,
    canEdit: false, // Can create tapi tidak bisa edit punya orang lain
    canDelete: false,
    canViewFinance: false,
    canManageUsers: false,
    canApproveTransactions: false,
  },
  akuntan: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canViewFinance: true,
    canManageUsers: false,
    canApproveTransactions: false,
  },
  viewer: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canViewFinance: true,
    canManageUsers: false,
    canApproveTransactions: false,
  },
}

export function hasModulePermission(user: PermissionUser, module: ModulePermission): boolean {
  if ((user.role ?? '').trim().toLowerCase() === 'owner') return true
  return parseModulePermissions(user.permissions)[module]
}

/** Peran custom mendapat create/edit/view pada modul yang diaktifkan owner. */
export function hasUserPermission(
  user: PermissionUser,
  permission: keyof Permissions,
  module?: ModulePermission,
): boolean {
  const role = (user.role ?? '').trim().toLowerCase()
  if (role === 'owner') return true
  if (module && !hasModulePermission(user, module)) return false
  if (role in permissionMatrix) return getPermissions(role)[permission]
  if (!module) return false
  return permission === 'canCreate' || permission === 'canEdit' || permission === 'canViewFinance'
}

export function requireUserPermission(
  user: PermissionUser,
  permission: keyof Permissions,
  module?: ModulePermission,
): void {
  if (!hasUserPermission(user, permission, module)) {
    throw new Error('Anda tidak memiliki izin untuk melakukan aksi ini')
  }
}

// Hak akses paling minim — dipakai untuk peran yang tidak dikenal (fail-closed).
const noPermissions: Permissions = {
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canViewFinance: false,
  canManageUsers: false,
  canApproveTransactions: false,
}

export function getPermissions(role: string | null | undefined): Permissions {
  // Normalisasi: role di DB bisa berupa "Kasir", "OWNER", dll. Samakan ke
  // lowercase agar cocok dengan matrix. Peran tak dikenal -> tanpa hak akses.
  const key = (role ?? '').trim().toLowerCase() as UserRole
  return permissionMatrix[key] ?? noPermissions
}

export function hasPermission(role: string | null | undefined, permission: keyof Permissions): boolean {
  return getPermissions(role)[permission]
}

// Helper function to check if user can perform action
export function canPerformAction(role: string | null | undefined, action: string): boolean {
  const perms = getPermissions(role)

  switch (action) {
    case 'create':
      return perms.canCreate
    case 'edit':
      return perms.canEdit
    case 'delete':
      return perms.canDelete
    case 'view-finance':
      return perms.canViewFinance
    case 'manage-users':
      return perms.canManageUsers
    case 'approve':
      return perms.canApproveTransactions
    default:
      return false
  }
}

// Throw error if permission denied (untuk server actions)
export function requirePermission(role: string | null | undefined, permission: keyof Permissions): void {
  if (!getPermissions(role)[permission]) {
    throw new Error('Anda tidak memiliki izin untuk melakukan aksi ini')
  }
}
