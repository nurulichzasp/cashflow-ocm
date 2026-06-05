import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import { eq, and } from 'drizzle-orm'
import * as schema from '../lib/db/schema'
import { hashPassword } from '@better-auth/utils/password'

const db = drizzle({
  connection: {
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
  schema,
})

async function resetPassword() {
  const email = 'admin@ocm.com'
  const newPassword = 'password123'

  console.log(`🔑 Reset password untuk ${email}...`)

  const user = await db.query.user.findFirst({ where: eq(schema.user.email, email) })
  if (!user) {
    console.log('❌ User tidak ditemukan, jalankan db:seed dulu')
    process.exit(1)
  }

  const hashedPassword = await hashPassword(newPassword)

  // Update existing credential account, or insert if missing
  const existing = await db.query.account.findFirst({
    where: and(
      eq(schema.account.userId, user.id),
      eq(schema.account.providerId, 'credential')
    ),
  })

  if (existing) {
    await db.update(schema.account)
      .set({ password: hashedPassword })
      .where(and(
        eq(schema.account.userId, user.id),
        eq(schema.account.providerId, 'credential')
      ))
    console.log('  → Password diupdate di akun credential yang ada')
  } else {
    await db.insert(schema.account).values({
      id: crypto.randomUUID(),
      userId: user.id,
      accountId: user.id,
      providerId: 'credential',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    console.log('  → Akun credential baru dibuat')
  }

  // Pastikan role owner
  await db.update(schema.user).set({ role: 'owner' }).where(eq(schema.user.id, user.id))

  console.log('✅ Password berhasil direset!')
  console.log(`   Email    : ${email}`)
  console.log(`   Password : ${newPassword}`)
  console.log(`   Role     : owner`)
}

resetPassword().catch((err) => {
  console.error('❌ Gagal:', err)
  process.exit(1)
})
