'use client'

import { ShoppingCart, TrendingUp, DollarSign, Receipt } from 'lucide-react'
import { PembelianFormDialog } from '../pembelian/pembelian-form-dialog'
import { PenjualanFormDialog } from '../penjualan/penjualan-form-dialog'
import { HargaFormDialog } from '../harga/harga-form-dialog'
import { BiayaFormDialog } from '../biaya/biaya-form-dialog'

type PeronOption = { id: string; nama: string; keuntunganPerKg: number }
type AkunOption = { id: string; nama: string; tipe: string }

const tile = 'tactile flex flex-col items-center gap-1.5 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
const square =
  'grid h-14 w-14 place-items-center rounded-2xl border border-stone-200/80 bg-card text-stone-700 shadow-[var(--shadow-card)] dark:border-white/[0.07] dark:text-zinc-200'
const squarePrimary =
  'grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-solid)] text-white shadow-[var(--shadow-card)]'
const label = 'text-[11px] font-medium text-stone-600 dark:text-zinc-400'

/**
 * Baris aksi cepat — semua "catat baru" (create). Reuse form-dialog tiap modul
 * (buka dialog langsung dari beranda — hemat tap). Hanya tampil untuk role
 * `canCreate`; tiap aksi juga dihormati per-modul (admin yang modulnya dimatikan).
 */
export function QuickActions({
  peronOptions,
  akunOptions,
  showPembelian,
  showPenjualan,
  showHarga,
  showBiaya,
}: {
  peronOptions: PeronOption[]
  akunOptions: AkunOption[]
  showPembelian: boolean
  showPenjualan: boolean
  showHarga: boolean
  showBiaya: boolean
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {showPembelian && (
        <PembelianFormDialog peronOptions={peronOptions} akunOptions={akunOptions}>
          <button type="button" className={tile} aria-label="Catat pembelian baru">
            <span className={squarePrimary}>
              <ShoppingCart className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className={label}>Pembelian</span>
          </button>
        </PembelianFormDialog>
      )}

      {showPenjualan && (
        <PenjualanFormDialog>
          <button type="button" className={tile} aria-label="Catat penjualan baru">
            <span className={square}>
              <TrendingUp className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className={label}>Penjualan</span>
          </button>
        </PenjualanFormDialog>
      )}

      {showHarga && (
        <HargaFormDialog>
          <button type="button" className={tile} aria-label="Tambah harga acuan">
            <span className={square}>
              <DollarSign className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className={label}>Harga</span>
          </button>
        </HargaFormDialog>
      )}

      {showBiaya && (
        <BiayaFormDialog akunOptions={akunOptions}>
          <button type="button" className={tile} aria-label="Catat biaya operasional">
            <span className={square}>
              <Receipt className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className={label}>Biaya</span>
          </button>
        </BiayaFormDialog>
      )}
    </div>
  )
}
