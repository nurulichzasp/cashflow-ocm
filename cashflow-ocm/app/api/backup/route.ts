import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { createBackup, exportBackupToExcel, exportBackupToJSON, getBackupFilename } from '@/lib/backup'
import { logActivity } from '@/lib/audit'
import { timingSafeEqual } from 'node:crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 second timeout for backup

// Bandingkan token secara timing-safe untuk mempersempit timing attack.
function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only owner can create backups
    if (session.user.role !== 'owner') {
      return Response.json({ error: 'Only owner can create backups' }, { status: 403 })
    }

    const url = new URL(request.url)
    const format = (url.searchParams.get('format') || 'xlsx') as 'xlsx' | 'json'

    // Create backup
    const backup = await createBackup()

    // Log backup activity
    await logActivity({
      userId: session.user.id,
      action: 'export',
      entityType: 'user',
      description: `Database backup created (format: ${format})`,
    }).catch((err) => console.error('Failed to log backup:', err))

    if (format === 'json') {
      const json = exportBackupToJSON(backup)
      return new Response(json, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${getBackupFilename('json')}"`,
        },
      })
    }

    // Default to Excel format
    const blob = exportBackupToExcel(backup)
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${getBackupFilename('xlsx')}"`,
      },
    })
  } catch (error) {
    console.error('Backup failed:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Backup failed' },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint for scheduled backups (can be called by external cron service)
 * Usage: POST /api/backup?token=YOUR_BACKUP_TOKEN
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    // Token dibaca dari header Authorization: Bearer <token> agar tidak
    // ikut tercatat di access-log/proxy seperti bila lewat query string.
    const authHeader = request.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    // Verify backup token (timing-safe) dari header Authorization: Bearer <token>
    if (!process.env.BACKUP_TOKEN || !safeEqual(token, process.env.BACKUP_TOKEN)) {
      return Response.json({ error: 'Invalid backup token' }, { status: 401 })
    }

    const format = (url.searchParams.get('format') || 'xlsx') as 'xlsx' | 'json'
    const backup = await createBackup()

    // In production, you would upload this to cloud storage (Vercel Blob, S3, etc)
    // For now, we'll just return the backup data
    const metadata = {
      timestamp: backup.timestamp,
      format,
      size: JSON.stringify(backup).length,
      summary: backup.summary,
    }

    console.log('[Backup] Scheduled backup completed:', metadata)

    return Response.json({
      success: true,
      message: 'Backup created successfully',
      metadata,
    })
  } catch (error) {
    console.error('[Backup] Scheduled backup failed:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Backup failed' },
      { status: 500 }
    )
  }
}
