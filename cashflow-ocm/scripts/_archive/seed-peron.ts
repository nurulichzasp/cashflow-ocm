import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import { eq } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const db = drizzle({
  connection: {
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
  schema,
})

// ─── Data Akun Kas ────────────────────────────────────────────────────────────

const akunData = [
  { nama: 'Rek BRI CV OCM',      tipe: 'bank'  as const, saldoAwal: 6_582_254,   urutan: 1 },
  { nama: 'Rek BRI BRILink',     tipe: 'bank'  as const, saldoAwal: 4_261_538,   urutan: 2 },
  { nama: 'Rek BRI Mama (4548)', tipe: 'bank'  as const, saldoAwal: 10_631_125,  urutan: 3 },
  { nama: 'Rek BRI Mama (2047)', tipe: 'bank'  as const, saldoAwal: 283_105_443, urutan: 4 },
  { nama: 'Brangkas (Tunai)',    tipe: 'tunai' as const, saldoAwal: 340_000_000, urutan: 5 },
]

// ─── Data Peron Asli ──────────────────────────────────────────────────────────

const peronData = [
  { kode: 1,    nama: 'Husein',  keuntunganPerKg: 40,  dpModal: 1_300_000_000 },
  { kode: null, nama: 'Wiranto', keuntunganPerKg: 0,   dpModal: 600_000_000   },
  { kode: 8,    nama: 'Roni',    keuntunganPerKg: 50,  dpModal: 500_000_000   },
  { kode: null, nama: 'Sany C',  keuntunganPerKg: 0,   dpModal: 250_000_000   },
  { kode: 6,    nama: 'Ciput',   keuntunganPerKg: 70,  dpModal: 215_000_000   },
  { kode: 2,    nama: 'Jono',    keuntunganPerKg: 50,  dpModal: 200_000_000   },
  { kode: 10,   nama: 'Neko',    keuntunganPerKg: 40,  dpModal: 200_000_000   },
  { kode: 4,    nama: 'Iwan',    keuntunganPerKg: 70,  dpModal: 150_000_000   },
  { kode: 5,    nama: 'Budi',    keuntunganPerKg: 50,  dpModal: 140_000_000   },
  { kode: null, nama: 'Napi',    keuntunganPerKg: 0,   dpModal: 140_000_000   },
  { kode: 9,    nama: 'Nolin',   keuntunganPerKg: 100, dpModal: 100_000_000   },
  { kode: null, nama: 'Sikun',   keuntunganPerKg: 0,   dpModal: 0             },
  { kode: 3,    nama: 'Hanafi',  keuntunganPerKg: 50,  dpModal: 0             },
  { kode: 11,   nama: 'Ibnu',    keuntunganPerKg: 80,  dpModal: 0             },
  { kode: 7,    nama: 'Umum',    keuntunganPerKg: 90,  dpModal: 0             }, // kelebihan 30/kg (120−90), seragam semua produk

  { kode: 0,    nama: 'Pribadi', keuntunganPerKg: 50,  dpModal: 0             },
]

const oldPeronNames = ['Pak Budi Santoso', 'Ibu Sari Dewi', 'Pak Hendra Kurnia', 'Peron Contoh A']
const today = new Date().toISOString().slice(0, 10)

async function main() {
  // ─── Seed Akun Kas ──────────────────────────────────────────────────────────
  console.log('🏦 Seeding akun kas...')

  for (const a of akunData) {
    const existing = await db.query.akunKas.findFirst({
      where: (t, { eq }) => eq(t.nama, a.nama),
    })
    if (existing) {
      await db.update(schema.akunKas)
        .set({ tipe: a.tipe, saldoAwal: a.saldoAwal, urutan: a.urutan })
        .where(eq(schema.akunKas.id, existing.id))
      console.log(`  ✓ ${a.nama} (diperbarui)`)
    } else {
      await db.insert(schema.akunKas).values(a)
      console.log(`  + ${a.nama} (ditambahkan)`)
    }
  }

  // ─── Hapus peron contoh lama ────────────────────────────────────────────────
  console.log('\n🗑️  Menghapus peron contoh lama...')
  for (const nama of oldPeronNames) {
    const old = await db.query.peron.findFirst({
      where: (t, { eq }) => eq(t.nama, nama),
    })
    if (old) {
      await db.delete(schema.modalPeron).where(eq(schema.modalPeron.peronId, old.id))
      await db.delete(schema.peron).where(eq(schema.peron.id, old.id))
      console.log(`  ✗ Dihapus: ${nama}`)
    }
  }

  // ─── Cari owner user ────────────────────────────────────────────────────────
  const ownerUser = await db.query.user.findFirst({
    where: (t, { eq }) => eq(t.role, 'owner'),
  })

  // ─── Seed Peron Asli ────────────────────────────────────────────────────────
  console.log('\n👥 Seeding peron asli...')

  for (const p of peronData) {
    const existing = await db.query.peron.findFirst({
      where: (t, { eq }) => eq(t.nama, p.nama),
    })

    if (existing) {
      await db.update(schema.peron)
        .set({ kode: p.kode, keuntunganPerKg: p.keuntunganPerKg })
        .where(eq(schema.peron.id, existing.id))
      console.log(`  ✓ ${p.nama} (diperbarui: kode=${p.kode ?? '-'}, untung=${p.keuntunganPerKg}/kg)`)
    } else {
      const inserted = await db.insert(schema.peron).values({
        kode: p.kode,
        nama: p.nama,
        status: 'aktif',
        keuntunganPerKg: p.keuntunganPerKg,
      }).returning()

      const peronId = inserted[0].id
      console.log(`  + ${p.nama} (baru: kode=${p.kode ?? '-'}, untung=${p.keuntunganPerKg}/kg)`)

      if (p.dpModal > 0 && ownerUser) {
        await db.insert(schema.modalPeron).values({
          peronId,
          tanggal: today,
          jenis: 'tambah',
          jumlah: p.dpModal,
          catatan: 'Saldo awal DP peron',
          createdBy: ownerUser.id,
        })
        console.log(`     ↳ DP awal: Rp ${p.dpModal.toLocaleString('id-ID')}`)
      }
    }
  }

  console.log('\n✅ Seeding selesai!')
  console.log('\nTotal peron:', peronData.length)
  console.log('Total akun kas:', akunData.length)

  if (!ownerUser) {
    console.log('\n⚠️  Tidak ada owner user — DP awal tidak diseed.')
    console.log('   Jalankan: npm run db:seed terlebih dahulu')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
