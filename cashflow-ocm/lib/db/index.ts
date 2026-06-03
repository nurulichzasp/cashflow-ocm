import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>

let _db: DrizzleDB | undefined

export function getDb(): DrizzleDB {
  if (!_db) {
    const url = process.env.TURSO_CONNECTION_URL
    if (!url) throw new Error('TURSO_CONNECTION_URL environment variable is not set')
    _db = drizzle({
      connection: {
        url,
        authToken: process.env.TURSO_AUTH_TOKEN,
      },
      schema,
    })
  }
  return _db
}

// Proxy agar sintaks `db.select(...)` tetap bisa dipakai langsung tanpa memanggil getDb()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: DrizzleDB = new Proxy({} as DrizzleDB, {
  get(_, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDb() as any)[prop]
  },
})

export type DB = DrizzleDB
