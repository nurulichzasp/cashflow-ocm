'use server'

import { headers } from 'next/headers'
import { or, eq, desc, sql, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { peron, pembelian, penjualan } from '@/lib/db/schema'
import { hasPermission } from '@/lib/permissions'

export type PeronHit = { id: string; nama: string; kode: number | null; kontak: string | null }
export type PembelianHit = { id: string; tanggal: string; kategori: string; totalBeli: number; peronNama: string | null }
export type PenjualanHit = { id: string; tanggal: string; noBast: string | null; noInvoice: string | null; nominal: number | null }
export type SearchResults = {
  peron: PeronHit[]
  pembelian: PembelianHit[]
  penjualan: PenjualanHit[]
  canFinance: boolean
}

const LIMIT = 6
const EMPTY: SearchResults = { peron: [], pembelian: [], penjualan: [], canFinance: false }

/**
 * Pencarian data lintas modul untuk Command Palette.
 *
 * - Mesin: LIKE case-insensitive (lower kolom + query) — cukup cepat untuk skala
 *   OCM (ribuan baris) tanpa FTS, tabel baru, atau migrasi (sesuai aturan additif).
 * - RBAC: transaksi (pembelian/penjualan) hanya untuk role `canViewFinance`.
 *   Peron tetap muncul untuk semua role. Soft-gate (bukan throw) supaya palette
 *   tetap berguna untuk role non-finance.
 * - Wildcard LIKE (% _ \) dibuang dari input → tak bisa dipakai mem-broaden/inject.
 */
export async function searchAll(rawQuery: string): Promise<SearchResults> {
  const cleaned = rawQuery.trim().toLowerCase().replace(/[%_\\]/g, ' ').trim()
  if (cleaned.length < 2) return EMPTY

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return EMPTY
  const canFinance = hasPermission(session.user.role, 'canViewFinance')

  const pat = `%${cleaned}%`
  const lk = (col: unknown): SQL => sql`lower(${col}) like ${pat}`

  const peronRows = await db
    .select({ id: peron.id, nama: peron.nama, kode: peron.kode, kontak: peron.kontak })
    .from(peron)
    .where(or(lk(peron.nama), lk(peron.kontak), sql`cast(${peron.kode} as text) like ${pat}`))
    .orderBy(peron.nama)
    .limit(LIMIT)

  let pembelianRows: PembelianHit[] = []
  let penjualanRows: PenjualanHit[] = []

  if (canFinance) {
    pembelianRows = await db
      .select({
        id: pembelian.id,
        tanggal: pembelian.tanggal,
        kategori: pembelian.kategori,
        totalBeli: pembelian.totalBeli,
        peronNama: peron.nama,
      })
      .from(pembelian)
      .leftJoin(peron, eq(peron.id, pembelian.peronId))
      .where(
        or(
          lk(peron.nama),
          lk(pembelian.tanggal),
          lk(pembelian.kategori),
          lk(pembelian.nopol),
          lk(pembelian.noTid),
          lk(pembelian.supir),
          lk(pembelian.catatan),
          lk(pembelian.keterangan),
        ),
      )
      .orderBy(desc(pembelian.tanggal))
      .limit(LIMIT)

    const penjualanRaw = await db
      .select({
        id: penjualan.id,
        tanggal: penjualan.tanggal,
        noBast: penjualan.noBast,
        noInvoice: penjualan.noInvoice,
        totalNilai: penjualan.totalNilai,
        totalBersih: penjualan.totalBersih,
      })
      .from(penjualan)
      .where(or(lk(penjualan.noBast), lk(penjualan.noInvoice), lk(penjualan.tanggal), lk(penjualan.catatan)))
      .orderBy(desc(penjualan.tanggal))
      .limit(LIMIT)

    penjualanRows = penjualanRaw.map((r) => ({
      id: r.id,
      tanggal: r.tanggal,
      noBast: r.noBast,
      noInvoice: r.noInvoice,
      nominal: r.totalNilai ?? r.totalBersih ?? null,
    }))
  }

  return { peron: peronRows, pembelian: pembelianRows, penjualan: penjualanRows, canFinance }
}
