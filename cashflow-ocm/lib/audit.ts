import { db } from './db'
import { activityLog } from './db/schema'
import { headers } from 'next/headers'

export type ActivityAction = 'create' | 'update' | 'delete' | 'view' | 'export' | 'approve'
export type EntityType = 'pembelian' | 'penjualan' | 'biaya_operasional' | 'transaksi_kas' | 'peron' | 'modal_peron' | 'user' | 'harga_acuan'

export interface AuditLogData {
  userId: string
  action: ActivityAction
  entityType: EntityType
  entityId?: string
  description: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Log an activity to the audit trail
 */
export async function logActivity(data: AuditLogData): Promise<void> {
  try {
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    await db.insert(activityLog).values({
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      description: data.description,
      oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
      newValues: data.newValues ? JSON.stringify(data.newValues) : null,
      ipAddress: data.ipAddress || ipAddress,
      userAgent: data.userAgent || userAgent,
    })
  } catch (error) {
    // Log audit failure but don't break the main transaction
    console.error('Failed to log activity:', error)
  }
}

/**
 * Get activity log with pagination
 */
export async function getActivityLog(limit = 100, offset = 0) {
  return db.query.activityLog.findMany({
    orderBy: (a, { desc }) => [desc(a.createdAt)],
    limit,
    offset,
    with: {
      user: true,
    },
  })
}

/**
 * Format old/new values for display
 */
export function formatActivityValues(json: string | null): Record<string, unknown> {
  if (!json) return {}
  try {
    return JSON.parse(json)
  } catch {
    return {}
  }
}

/**
 * Create human-readable activity description
 */
export function describeActivity(action: ActivityAction, entityType: EntityType, details?: string): string {
  const typeLabel = entityType.replace(/_/g, ' ').toLowerCase()
  const actionLabel = action.toLowerCase()

  if (details) {
    return `${actionLabel} ${typeLabel}: ${details}`
  }

  return `${actionLabel} ${typeLabel}`
}
