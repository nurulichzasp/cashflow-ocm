export type UserRole = 'owner' | 'admin' | 'kasir' | 'akuntan' | 'viewer'

export interface Permissions {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canViewFinance: boolean
  canManageUsers: boolean
  canApproveTransactions: boolean
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

export function getPermissions(role: UserRole): Permissions {
  return permissionMatrix[role]
}

export function hasPermission(role: UserRole, permission: keyof Permissions): boolean {
  return getPermissions(role)[permission]
}

// Helper function to check if user can perform action
export function canPerformAction(role: UserRole, action: string): boolean {
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
export function requirePermission(role: UserRole, permission: keyof Permissions): void {
  if (!getPermissions(role)[permission]) {
    throw new Error(`Permission denied: ${permission} is not allowed for role ${role}`)
  }
}
