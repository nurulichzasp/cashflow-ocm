import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getBiayaList } from './actions'
import { BiayaTable } from './biaya-table'
import { BiayaFormDialog } from './biaya-form-dialog'
import { FloatingFab } from '@/components/fab'
import { formatCompact } from '@/lib/format'
import { db } from '@/lib/db'
import { akunKas } from '@/lib/db/schema'
import type { BiayaOperasional } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

const kategoriLabels: Record<BiayaOperasional['kategori'], string> = {
  gaji: 'Gaji',
  solar: 'Solar',
  transport: 'Transport',
  lainnya: 'Lainnya',
}

export default async function BiayaPage() {
  const [session, biayaList, akunList] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getBiayaList(),
    db.select().from(akunKas).orderBy(akunKas.urutan),
  ])

  const isOwner = session?.user.role === 'owner'
  const akunOptions = akunList.map((a) => ({ id: a.id, nama: a.nama, tipe: a.tipe }))
  const totalBiaya = biayaList.reduce((sum, item) => sum + item.jumlah, 0)

  const perKategori = (['gaji', 'solar', 'transport', 'lainnya'] as const).map((k) => ({
    label: kategoriLabels[k],
    total: biayaList.filter((b) => b.kategori === k).reduce((s, b) => s + b.jumlah, 0),
  })).filter((k) => k.total > 0)

  return (
    <div className="space-y-5">
      <BiayaFormDialog akunOptions={akunOptions}><FloatingFab /></BiayaFormDialog>

      <div className="space-y-2.5">
        {/* Hero: Total Pengeluaran */}
        <div className="surface press-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Total Pengeluaran</p>
          <p className="text-2xl font-bold text-stone-900 dark:text-zinc-50 num">{formatCompact(totalBiaya)}</p>
          <p className="text-xs text-stone-400 mt-1">{biayaList.length} entri tercatat</p>
        </div>
        {/* Rincian per kategori — teks ringkas, bukan card */}
        {perKategori.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[13px] text-stone-500 dark:text-stone-400">
            {perKategori.map((k) => (
              <span key={k.label}>
                {k.label} <span className="font-semibold text-stone-800 dark:text-zinc-200 num">{formatCompact(k.total)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <BiayaTable biayaList={biayaList} isOwner={isOwner} akunOptions={akunOptions} />
    </div>
  )
}
