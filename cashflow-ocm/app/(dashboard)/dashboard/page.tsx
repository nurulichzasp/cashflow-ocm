export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { parsePerms } from '@/lib/nav-routes'
import { db } from '@/lib/db'
import { akunKas, transaksiKas, pembelian } from '@/lib/db/schema'
import { sum, gte } from 'drizzle-orm'
import { getPeronList } from '../peron/actions'
import { getPeronHealthList } from '../peron/health-actions'
import {
  formatCompact,
  formatNumber,
  formatTanggalLengkap,
  formatTanggalPendek,
  jakartaDateString,
} from '@/lib/format'
import {
  ShoppingCart,
  TrendingUp,
  Receipt,
  Banknote,
  Coins,
  ArrowDownLeft,
  ArrowLeftRight,
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  HeartPulse,
  ChevronRight,
  Layers,
  Scale,
  Wallet,
} from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { QuickActions } from './quick-actions'
import { AkunCarousel, type AkunCard } from './akun-carousel'

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

async function getDashboardData() {
  const todayStr = jakartaDateString()
  const monthStart = `${todayStr.slice(0, 7)}-01`
  const weekAgo = jakartaDateString(-6) // 7 hari terakhir (inklusif hari ini)

  const [akunList, transaksiRows, deltaRows, pembelianMonthRows, recentTx, healthList] =
    await Promise.all([
      db.select().from(akunKas).orderBy(akunKas.urutan),

      // Saldo per akun = saldoAwal + Σ(masuk) − Σ(keluar). SAMA dgn halaman /kas.
      db
        .select({ akunId: transaksiKas.akunId, arah: transaksiKas.arah, total: sum(transaksiKas.jumlah) })
        .from(transaksiKas)
        .groupBy(transaksiKas.akunId, transaksiKas.arah),

      // Delta kas 7 hari terakhir (mutasi bertanggal ≥ weekAgo).
      db
        .select({ arah: transaksiKas.arah, total: sum(transaksiKas.jumlah) })
        .from(transaksiKas)
        .where(gte(transaksiKas.tanggal, weekAgo))
        .groupBy(transaksiKas.arah),

      // Ringkasan bulan berjalan: margin dagang (keuntungan) + volume (tonase kg).
      db
        .select({ keuntungan: sum(pembelian.keuntungan), tonaseKg: sum(pembelian.tonase) })
        .from(pembelian)
        .where(gte(pembelian.tanggal, monthStart)),

      // Transaksi terakhir — ledger kas (sumber paling murah & representatif).
      db.query.transaksiKas.findMany({
        orderBy: (t, { desc: d }) => [d(t.tanggal), d(t.createdAt)],
        limit: 5,
        with: { akun: true },
      }),

      // Kesehatan peron — reuse sumber halaman /peron/kesehatan (sudah non-archived).
      getPeronHealthList(),
    ])

  const mutasiPerAkun: Record<string, number> = {}
  for (const r of transaksiRows) {
    const prev = mutasiPerAkun[r.akunId] ?? 0
    mutasiPerAkun[r.akunId] = prev + (r.arah === 'masuk' ? Number(r.total ?? 0) : -Number(r.total ?? 0))
  }
  const akunSaldo = akunList.map((a) => ({ ...a, saldo: a.saldoAwal + (mutasiPerAkun[a.id] ?? 0) }))
  const totalSaldo = akunSaldo.reduce((s, a) => s + a.saldo, 0)

  let deltaMasuk = 0
  let deltaKeluar = 0
  for (const r of deltaRows) {
    if (r.arah === 'masuk') deltaMasuk += Number(r.total ?? 0)
    else deltaKeluar += Number(r.total ?? 0)
  }
  const delta7 = deltaMasuk - deltaKeluar

  const marginBulan = Number(pembelianMonthRows[0]?.keuntungan ?? 0)
  const volumeTon = Number(pembelianMonthRows[0]?.tonaseKg ?? 0) / 1000

  const peronKritis = healthList.filter((p) => p.status === 'kritis').length
  const peronPerhatian = healthList.filter((p) => p.status === 'perhatian').length

  return {
    akunSaldo, totalSaldo, delta7,
    marginBulan, volumeTon,
    recentTx, peronKritis, peronPerhatian,
    monthName: BULAN[Number(todayStr.slice(5, 7)) - 1],
    todayStr,
  }
}

export default async function DashboardPage() {
  // Dashboard membocorkan seluruh angka finansial (saldo, margin, transaksi).
  // Peran tanpa canViewFinance (mis. kasir) diarahkan ke halaman input — cek
  // SEBELUM query agar datanya tak ikut dihitung untuk yang tak berhak.
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  if (!hasPermission(session.user.role, 'canViewFinance')) redirect('/pembelian')

  const role = session.user.role
  const isOwner = role === 'owner'
  const canCreate = hasPermission(role, 'canCreate')
  const perms = parsePerms((session.user as { permissions?: string | null }).permissions)

  const data = await getDashboardData()

  // Opsi form untuk aksi cepat (hanya difetch bila role boleh create).
  let peronOptions: { id: string; nama: string; keuntunganPerKg: number }[] = []
  const akunOptions = data.akunSaldo.map((a) => ({ id: a.id, nama: a.nama, tipe: a.tipe }))
  if (canCreate) {
    const peronList = await getPeronList()
    peronOptions = peronList.map((p) => ({ id: p.id, nama: p.nama, keuntunganPerKg: p.keuntunganPerKg }))
  }

  // Akun utama (CV OCM) ditandai — selaras hierarki halaman /kas.
  const utamaId =
    data.akunSaldo.find((a) => a.nama.toLowerCase().includes('cv ocm'))?.id ?? data.akunSaldo[0]?.id
  const akunCards: AkunCard[] = data.akunSaldo.map((a) => ({
    id: a.id,
    nama: a.nama,
    tipe: a.tipe,
    saldo: a.saldo,
    utama: a.id === utamaId,
  }))

  const displayName = session.user.nickname || session.user.name || 'OCM'

  return (
    <div className="space-y-5 pb-2 pt-1 md:pt-0">
      {/* A. Sapaan + tanggal WIB (app-bar logo/avatar sudah di ScrollShell) */}
      <div className="px-0.5">
        <h1 className="text-[1.35rem] font-bold leading-tight tracking-tight text-stone-900 dark:text-zinc-50">
          Halo, {displayName}
        </h1>
        <p className="mt-0.5 text-[13px] text-stone-400 dark:text-zinc-500 capitalize">
          {formatTanggalLengkap(data.todayStr)}
        </p>
      </div>

      {/* B. Hero — Total Kas (gelap selalu, putih). Sumber == /kas. */}
      <TotalKasHero total={data.totalSaldo} delta7={data.delta7} />

      {/* C. Aksi cepat — hanya role canCreate */}
      {canCreate && (
        <QuickActions
          peronOptions={peronOptions}
          akunOptions={akunOptions}
          showPembelian={isOwner || perms.pembelian !== false}
          showPenjualan={isOwner || perms.penjualan !== false}
          showHarga
          showBiaya={isOwner || perms.biaya !== false}
        />
      )}

      {/* D. Akun kas — geser horizontal */}
      {akunCards.length > 0 ? (
        <AkunCarousel items={akunCards} />
      ) : (
        <EmptyState icon={Wallet} title="Belum ada akun kas" description="Tambah akun kas di Buku Kas untuk mulai mencatat saldo." />
      )}

      {/* E. Ringkasan bulan berjalan */}
      <section>
        <p className="mb-2.5 px-0.5 text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
          Ringkasan {data.monthName}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            icon={Layers}
            label="Margin Dagang"
            value={formatCompact(data.marginBulan)}
            sub="Markup peron · sblm biaya"
          />
          <SummaryCard
            icon={Scale}
            label="Volume"
            value={`${formatNumber(Math.round(data.volumeTon * 10) / 10)} ton`}
            sub="Tonase pembelian"
          />
        </div>
      </section>

      {/* F. Kesehatan peron — 1 baris ringkas, tappable */}
      <PeronHealthRow kritis={data.peronKritis} perhatian={data.peronPerhatian} />

      {/* G. Transaksi terakhir */}
      <RecentTransactions items={data.recentTx} />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   B. Hero — Total Kas
   ────────────────────────────────────────────────────────────── */
function TotalKasHero({ total, delta7 }: { total: number; delta7: number }) {
  const up = delta7 > 0
  const down = delta7 < 0
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#191919] p-6 text-white shadow-[var(--shadow-card)] dark:bg-[#0F0F0F]">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">Total Kas</p>
      <p className="mt-2 num tabular-nums text-[2.6rem] font-bold leading-none tracking-[-0.03em]">
        {formatCompact(total)}
      </p>
      <div className="mt-3 flex items-center gap-1.5 text-[12px]">
        {up && (
          <>
            <span className="inline-flex items-center gap-0.5 font-semibold num tabular-nums" style={{ color: '#35C892' }}>
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              {formatCompact(delta7)}
            </span>
            <span className="text-white/40">· 7 hari terakhir</span>
          </>
        )}
        {down && (
          <>
            <span className="inline-flex items-center gap-0.5 font-semibold num tabular-nums text-white/75">
              <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              {formatCompact(Math.abs(delta7))}
            </span>
            <span className="text-white/40">· 7 hari terakhir</span>
          </>
        )}
        {!up && !down && <span className="text-white/45">Per hari ini</span>}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   E. Kartu ringkasan
   ────────────────────────────────────────────────────────────── */
function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="surface p-4">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-stone-400 dark:text-zinc-500" strokeWidth={2} />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">{label}</p>
      </div>
      <p className="mt-2 num tabular-nums text-xl font-bold tracking-tight text-stone-900 dark:text-zinc-50">{value}</p>
      <p className="mt-1 text-[11px] text-stone-400 dark:text-zinc-500">{sub}</p>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   F. Kesehatan peron
   ────────────────────────────────────────────────────────────── */
function PeronHealthRow({ kritis, perhatian }: { kritis: number; perhatian: number }) {
  const total = kritis + perhatian
  const parts: string[] = []
  if (kritis > 0) parts.push(`${kritis} kritis`)
  if (perhatian > 0) parts.push(`${perhatian} perlu perhatian`)
  const aman = total === 0

  return (
    <Link href="/peron/kesehatan" className="surface row-press flex items-center gap-3 p-4">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
        style={
          aman
            ? { backgroundColor: 'rgba(120,113,108,0.10)' }
            : { backgroundColor: 'color-mix(in oklab, var(--warning) 14%, transparent)' }
        }
      >
        <HeartPulse
          className="h-4 w-4"
          strokeWidth={2}
          style={{ color: aman ? '#78716C' : 'var(--warning)' }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-stone-900 dark:text-zinc-100">
          {aman ? 'Semua peron normal' : parts.join(' · ')}
        </p>
        <p className="text-[11px] text-stone-400 dark:text-zinc-500">Kesehatan Peron</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-stone-300 dark:text-zinc-600" />
    </Link>
  )
}

/* ──────────────────────────────────────────────────────────────────
   G. Transaksi terakhir (ledger kas)
   ────────────────────────────────────────────────────────────── */
const KATEGORI_META: Record<string, { label: string; icon: React.ElementType }> = {
  penerimaan_bga: { label: 'Penerimaan BGA', icon: TrendingUp },
  tarik_bri: { label: 'Tarik Tunai', icon: Banknote },
  bayar_peron: { label: 'Bayar Peron', icon: ShoppingCart },
  modal_peron: { label: 'Modal Peron', icon: Coins },
  kembali_modal: { label: 'Kembali Modal', icon: ArrowDownLeft },
  biaya_operasional: { label: 'Biaya Operasional', icon: Receipt },
  penyesuaian: { label: 'Penyesuaian', icon: ArrowLeftRight },
  lainnya: { label: 'Lainnya', icon: CircleDollarSign },
}

type RecentTxRow = {
  id: string
  tanggal: string
  arah: 'masuk' | 'keluar'
  jumlah: number
  kategori: string
  catatan: string | null
  akun: { nama: string } | null
}

function RecentTransactions({ items }: { items: RecentTxRow[] }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between px-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
          Transaksi Terakhir
        </p>
        {items.length > 0 && (
          <Link
            href="/kas"
            className="text-[11px] font-semibold text-[var(--brand)] transition-opacity hover:opacity-70"
          >
            Lihat semua
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Wallet} title="Belum ada transaksi" description="Transaksi kas terakhir akan muncul di sini." />
      ) : (
        <div className="surface divide-y divide-stone-100 dark:divide-border overflow-hidden">
          {items.map((t) => {
            const meta = KATEGORI_META[t.kategori] ?? KATEGORI_META.lainnya
            const Icon = meta.icon
            const masuk = t.arah === 'masuk'
            const sub = [t.akun?.nama, t.catatan?.trim()].filter(Boolean).join(' · ')
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-100 dark:bg-white/[0.06]">
                  <Icon className="h-4 w-4 text-stone-600 dark:text-zinc-300" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-900 dark:text-zinc-100">{meta.label}</p>
                  {sub && <p className="truncate text-[11px] text-stone-400 dark:text-zinc-500">{sub}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className="num tabular-nums text-sm font-bold"
                    style={masuk ? { color: 'var(--masuk)' } : undefined}
                  >
                    <span className={masuk ? '' : 'text-stone-900 dark:text-zinc-100'}>
                      {masuk ? '+' : '−'}{formatCompact(t.jumlah)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-stone-400 dark:text-zinc-500">{formatTanggalPendek(t.tanggal)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
