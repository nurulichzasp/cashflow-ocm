import { createClient } from '@libsql/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const client = createClient({
      url: process.env.TURSO_CONNECTION_URL ?? 'NOT SET',
      authToken: process.env.TURSO_AUTH_TOKEN,
    })

    // Cek tabel yang ada
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    const tableNames = tables.rows.map(r => r[0])

    // Cek user count
    let userCount = 0
    if (tableNames.includes('user')) {
      const users = await client.execute("SELECT COUNT(*) as cnt FROM user")
      userCount = Number(users.rows[0][0])
    }

    return Response.json({
      status: 'ok',
      turso_url: process.env.TURSO_CONNECTION_URL?.replace(/\/\/.*@/, '//***@').slice(0, 60),
      tables: tableNames,
      user_count: userCount,
    })
  } catch (e: any) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 })
  }
}
