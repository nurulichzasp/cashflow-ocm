import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

// Kumpulkan semua origin yang dipercaya — SEMUA dari ENV, tidak ada hardcode.
// VERCEL_URL & VERCEL_BRANCH_URL otomatis tersedia di setiap deployment Vercel.
// Saat pindah ke domain .com cukup set ENV di Vercel (BETTER_AUTH_URL /
// NEXT_PUBLIC_APP_URL), atau daftarkan beberapa domain sekaligus via
// ADDITIONAL_TRUSTED_ORIGINS (dipisah koma) — tanpa ubah kode.
const extraOrigins = (process.env.ADDITIONAL_TRUSTED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const trustedOrigins = Array.from(
  new Set(
    [
      process.env.BETTER_AUTH_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
      process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined,
      ...extraOrigins,
    ].filter(Boolean) as string[],
  ),
)

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
    // KEAMANAN: matikan pendaftaran publik. Pembuatan user hanya lewat
    // server action addUser (owner-only). Tanpa ini, siapa pun bisa
    // POST /api/auth/sign-up/email dan dapat akun (lihat default role di bawah).
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        // Default paling rendah (defense-in-depth). Owner/role lain di-set
        // eksplisit saat user dibuat via addUser.
        defaultValue: 'viewer',
        input: false,
        // Supported roles: owner, admin, kasir, akuntan, viewer
      },
      nickname: { type: 'string', required: false },
      fullName: { type: 'string', required: false },
      companyEmail: { type: 'string', required: false },
      personalEmail: { type: 'string', required: false },
      phone: { type: 'string', required: false },
      address: { type: 'string', required: false },
      permissions: { type: 'string', required: false },
      // permissions: JSON string with custom permission overrides
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    // Cache sesi di cookie bertanda-tangan agar getSession tidak hit DB tiap
    // render (layout + page sama-sama panggil getSession per navigasi → 2 query
    // sesi per load sebelum ini). role (user.additionalFields) ikut tersimpan
    // via parseUserOutput, jadi SEMUA gate owner/permission tetap jalan.
    // maxAge sengaja pendek (60 dtk): perubahan role / pencabutan sesi basi
    // paling lama 1 menit — penting untuk app keuangan.
    cookieCache: {
      enabled: true,
      maxAge: 60,
    },
  },
})

export type Session = typeof auth.$Infer.Session
export type AuthUser = typeof auth.$Infer.Session.user