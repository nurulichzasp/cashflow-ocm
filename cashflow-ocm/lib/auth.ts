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

// ── PARAMETER sesi pendek ala m-banking (gampang diubah) ─────────────────────
// Data keuangan sensitif → sesi tidak boleh bertahan lama. Tiap buka app
// setelah idle/tutup melewati timeout = harus login ulang.
//
// IDLE_TIMEOUT = umur sesi sejak aktivitas terakhir. Selama user aktif sesi
// diperpanjang (sliding refresh, lihat updateAge di bawah); begitu idle
// melewati timeout → sesi mati di server → user diarahkan ke /login.
const IDLE_TIMEOUT_SECONDS = 60 * 15 // 15 menit
// Seberapa sering expiry sesi di-refresh saat user aktif. Dibuat jauh lebih
// pendek dari IDLE_TIMEOUT supaya sliding terasa mulus: tiap kali user aktif
// (request) dan sesi terakhir di-update > updateAge lalu, expiry di-reset ke
// now + IDLE_TIMEOUT. Efek akhir: aktif = sesi hidup, idle > 15 mnt = mati.
const SESSION_UPDATE_AGE_SECONDS = 60 * 3 // refresh tiap ~3 menit aktivitas

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
    // Umur sesi pendek + sliding refresh (lihat PARAMETER di atas).
    expiresIn: IDLE_TIMEOUT_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
    // cookieCache: cache sesi di cookie ber-TTL agar getSession tidak selalu
    // hit DB. Bahaya untuk kasus ini: kalau TTL panjang, sesi bisa terasa
    // "hidup" walau server sudah expired (proxy & getSession baca cache, bukan
    // DB) → celah. Maka DIMATIKAN: tiap cek sesi memvalidasi ke DB sehingga
    // sesi expired langsung ditolak (proxy.ts mengandalkan validasi ini).
    cookieCache: {
      enabled: false,
    },
  },
  // Catatan persistensi cookie:
  // Better Auth meng-hardcode maxAge cookie sesi = expiresIn KECUALI sign-in
  // pakai rememberMe:false — tapi rememberMe:false JUGA mematikan sliding
  // refresh (sesi jadi mati pas 15 mnt sejak LOGIN walau user aktif). Karena
  // acceptance criteria mewajibkan "aktif < timeout = sesi TIDAK putus"
  // (sliding), kita TIDAK pakai rememberMe:false. Keandalan lintas platform
  // (termasuk PWA iOS yang cookie-nya bisa nyangkut) dijamin oleh kombinasi:
  //   (1) expiry server pendek + sliding (di sini), dan
  //   (2) proxy.ts yang MEMVALIDASI sesi (bukan cuma cek keberadaan cookie),
  // sehingga cookie expired apa pun selalu ditolak → /login.
})

export type Session = typeof auth.$Infer.Session
export type AuthUser = typeof auth.$Infer.Session.user