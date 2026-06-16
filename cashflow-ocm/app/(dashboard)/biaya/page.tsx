import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getBiayaList } from './actions'
import { BiayaTable } from './biaya-table'
import { BiayaFormDialog } from './biaya-form-dialog'
import { FloatingFab } from '@/components/fab'
import { db } from '@/lib/db'
import { akunKas } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export default async function BiayaPage() {
  const [session, biayaList, akunList] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getBiayaList(),
    db.select().from(akunKas).orderBy(akunKas.urutan),
  ])

  const isOwner = session?.user.role === 'owner'
  const akunOptions = akunList.map((a) => ({ id: a.id, nama: a.nama, tipe: a.tipe }))

  // Hero "Total Pengeluaran" + rincian per kategori kini IKUT filter → ada di BiayaTable.
  return (
    <div className="space-y-5">
      <BiayaFormDialog akunOptions={akunOptions}><FloatingFab /></BiayaFormDialog>
      <BiayaTable biayaList={biayaList} isOwner={isOwner} akunOptions={akunOptions} />
    </div>
  )
}
