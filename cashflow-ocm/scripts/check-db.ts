import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from '../lib/db/schema'
import { eq } from 'drizzle-orm'

const db = drizzle({ connection: { url: process.env.TURSO_CONNECTION_URL!, authToken: process.env.TURSO_AUTH_TOKEN }, schema })

async function main() {
  const user = await db.query.user.findFirst({ where: eq(schema.user.email, 'admin@ocm.com') })
  console.log('user:', JSON.stringify(user))
  if (!user) return
  const accounts = await db.query.account.findMany({ where: eq(schema.account.userId, user.id) })
  for (const acc of accounts) {
    console.log('account:', acc.providerId, acc.accountId, 'password prefix:', acc.password?.slice(0, 30))
  }
}
main().catch(console.error)
