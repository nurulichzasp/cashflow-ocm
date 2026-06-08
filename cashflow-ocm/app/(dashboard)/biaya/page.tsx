import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getBiayaList } from './actions'
import { BiayaTable } from './biaya-table'
import { BiayaFormDialog } from './biaya-form-dialog'
import { Button } from '@/components/ui/button'
import { FloatingFab } from '@/components/fab'
import { formatRupiah } from '@/lib/format'
import { Plus } from 'lucide-react'
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="surface press-card p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Total Pengeluaran</p>
          <p className="text-2xl font-bold text-stone-900 dark:text-zinc-50 num">{formatRupiah(totalBiaya)}</p>
          <p className="text-xs text-stone-400 mt-1">{biayaList.length} entri tercatat</p>
        </div>
        {perKategori.slice(0, 2).map((k) => (
          <div key={k.label} className="surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">{k.label}</p>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 num tabular-nums">{formatRupiah(k.total)}</p>
            <p className="text-xs text-stone-400 mt-1">Total biaya {k.label.toLowerCase()}</p>
          </div>
        ))}
      </div>

      <BiayaTable biayaList={biayaList} isOwner={isOwner} />
    </div>
  )
}
