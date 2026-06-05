import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

// Kumpulkan semua origin yang dipercaya
// VERCEL_URL & VERCEL_BRANCH_URL otomatis tersedia di setiap deployment Vercel
const trustedOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined,
].filter(Boolean) as string[]

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
    usePlural: false,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'admin',
        input: false,
      },
      nickname: { type: 'string', required: false },
      fullName: { type: 'string', required: false },
      companyEmail: { type: 'string', required: false },
      personalEmail: { type: 'string', required: false },
      phone: { type: 'string', required: false },
      address: { type: 'string', required: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
})

export type Session = typeof auth.$Infer.Session
export type AuthUser = typeof auth.$Infer.Session.user