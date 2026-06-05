import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from '../lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyPassword } from '@better-auth/utils/password'

const db = drizzle({ connection: { url: process.env.TURSO_CONNECTION_URL!, authToken: process.env.TURSO_AUTH_TOKEN }, schema })

async function main() {
  const user = await db.query.user.findFirst({ where: eq(schema.user.email, 'admin@ocm.com') })
  if (!user) { console.log('user not found'); return }
  
  const acc = await db.query.account.findFirst({
    where: and(eq(schema.account.userId, user.id), eq(schema.account.providerId, 'credential'))
  })
  if (!acc?.password) { console.log('no credential account'); return }
  
  console.log('hash stored:', acc.password.slice(0, 40) + '...')
  const ok = await verifyPassword(acc.password, 'password123')
  console.log('verify "password123":', ok)
}
main().catch(console.error)
