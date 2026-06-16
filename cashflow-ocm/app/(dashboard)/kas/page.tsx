import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getKasTransactions, getAkunKasList } from './actions'
import { KasTable } from './kas-table'
import { KasFormDialog } from './kas-form-dialog'
import { FloatingFab } from '@/components/fab'
import { formatRupiah, formatCompact } from '@/lib/format'
import { saldoPerAkun } from '@/lib/saldo'

export const dynamic = 'force-dynamic'

export default async function KasPage() {
  const [session, transaksiList, akunList] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getKasTransactions(),
    getAkunKasList(),
  ])

  const isOwner = session?.user.role === 'owner'

  // Saldo per akun = saldoAwal + Σ(masuk) − Σ(keluar). Rumus dari lib/saldo.ts (teruji unit).
  const akunSaldo = saldoPerAkun(akunList, transaksiList)

  const totalSaldo = akunSaldo.reduce((s, a) => s + a.saldo, 0)

  const akunOptions = akunList.map((a) => ({ id: a.id, nama: a.nama, tipe: a.tipe }))

  // Akun utama (operasional) dipromosikan: cari "CV OCM" (case-insensitive),
  // fallback ke akun pertama. Sisanya jadi list sekunder yang lebih ringkas —
  // mengikuti pola hierarki Saldo Rekening di dashboard (angka utama dominan,
  // bukan grid kartu sederajat).
  const akunUtama = akunSaldo.find((a) => a.nama.toLowerCase().includes('cv ocm')) ?? akunSaldo[0] ?? null
  const akunSekunder = akunSaldo.filter((a) => a.id !== akunUtama?.id)

  return (
    <div className="space-y-5">
      <KasFormDialog akunOptions={akunOptions}><FloatingFab /></KasFormDialog>

      {/* Saldo per akun — hierarki: akun utama dominan, sisanya list sekunder ringkas */}
      <div className="surface overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100 dark:border-border flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">Saldo Rekening &amp; Kas</p>
          <p className="text-xs font-semibold num tabular-nums text-stone-900 dark:text-stone-100">{formatCompact(totalSaldo)}</p>
        </div>

        {akunUtama && (
          <div className="px-5 pt-4 pb-3.5 border-b border-stone-100 dark:border-border">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-stone-900 dark:bg-white shrink-0" />
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 truncate">{akunUtama.nama}</p>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500 shrink-0">Utama</span>
            </div>
            <p className={`mt-1.5 text-3xl sm:text-4xl font-bold num tabular-nums tracking-[-0.02em] leading-none ${akunUtama.saldo >= 0 ? 'text-stone-900 dark:text-zinc-50' : 'text-crit'}`}>
              {formatRupiah(akunUtama.saldo)}
            </p>
            <p className="mt-1.5 text-xs text-stone-400 dark:text-zinc-500">
              {akunUtama.tipe === 'bank' ? 'Rekening Bank' : 'Uang Tunai'}
            </p>
          </div>
        )}

        {akunSekunder.length > 0 && (
          <div className="divide-y divide-stone-100 dark:divide-border">
            {akunSekunder.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm text-stone-600 dark:text-stone-300 truncate">{a.nama}</p>
                  <span className="text-[10px] text-stone-400 dark:text-zinc-500 uppercase tracking-wider shrink-0">
                    {a.tipe === 'bank' ? 'Bank' : 'Tunai'}
                  </span>
                </div>
                <p className={`text-sm font-semibold num tabular-nums shrink-0 ${a.saldo >= 0 ? 'text-stone-800 dark:text-stone-200' : 'text-crit'}`}>
                  {formatRupiah(a.saldo)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Masuk / Keluar (ikut filter) pindah ke dalam KasTable. */}
      <KasTable transaksiList={transaksiList} isOwner={isOwner} />
    </div>
  )
}
