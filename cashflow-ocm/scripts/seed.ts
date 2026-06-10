import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import { eq } from 'drizzle-orm'
import * as schema from '../lib/db/schema'
import { auth } from '../lib/auth'

const db = drizzle({
  connection: {
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
  schema,
})

async function seed() {
  // GUARD: seed menulis user/peron/harga ke DB TURSO_CONNECTION_URL (BISA PRODUKSI).
  // Wajib set CONFIRM_SEED=ya agar tidak terpicu tak sengaja.
  const dbHost = (process.env.TURSO_CONNECTION_URL ?? '(tak diset)').replace(/^libsql:\/\//, '').split('?')[0]
  if (process.env.CONFIRM_SEED !== 'ya') {
    console.error(`⛔ Dibatalkan. Seed akan menulis ke DB: ${dbHost}`)
    console.error('   Jalankan ulang: CONFIRM_SEED=ya npm run db:seed (pastikan DB benar).')
    process.exit(1)
  }

  console.log('🌱 Mulai seed data...')

  // Buat user owner via Better Auth
  console.log('  → Membuat user owner...')
  try {
    await auth.api.signUpEmail({
      body: {
        name: 'Admin OCM',
        email: 'admin@ocm.com',
        password: 'password123',
      },
    })
    // Set role menjadi owner
    await db.update(schema.user).set({ role: 'owner' }).where(eq(schema.user.email, 'admin@ocm.com'))
    console.log('  → User owner: admin@ocm.com / password123')
  } catch (err) {
    console.log('  → User mungkin sudah ada, lanjut...')
  }

  // Buat peron contoh
  console.log('  → Membuat data peron contoh...')

  const insertedPeron = await db
    .insert(schema.peron)
    .values([
      { nama: 'Peron Contoh A', kontak: '0812-0000-0001', keuntunganPerKg: 50 },
    ])
    .returning()
  console.log(`  → ${insertedPeron.length} peron dibuat (jalankan scripts/seed-peron.ts untuk data asli)`)

  // Buat harga acuan
  console.log('  → Membuat harga acuan...')
  const today = new Date().toISOString().slice(0, 10)
  await db.insert(schema.hargaAcuan).values([
    {
      tanggalBerlaku: today,
      produk: 'TBS',
      hargaLapangan: 1850,
      selisihJualBga: 120,
      catatan: 'Harga awal seed',
    },
    {
      tanggalBerlaku: today,
      produk: 'BRDL KTWM',
      hargaLapangan: 1600,
      selisihJualBga: 120,
      catatan: 'Harga awal seed',
    },
  ])
  console.log('  → Harga acuan TBS & BRDL KTWM dibuat')

  console.log('\n✅ Seed selesai!')
  console.log('\nAkun login:')
  console.log('  Email   : admin@ocm.com')
  console.log('  Password: password123')
  console.log('  Role    : owner')
}

seed().catch((err) => {
  console.error('❌ Seed gagal:', err)
  process.exit(1)
})
