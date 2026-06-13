import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getPeronById } from '../actions'
import { getPeronAccess } from '../portal-actions'
import { PortalLinkCard } from './portal-link-card'
import { PeronFormDialog } from '../peron-form-dialog'
import { ModalFormDialog } from '../modal-form-dialog'
import { ModalHistoryTable } from './modal-history-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { Edit, Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/db'
import { akunKas } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export default async function PeronDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [session, data, akunList, access] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getPeronById(id),
    db.select().from(akunKas).orderBy(akunKas.urutan),
    getPeronAccess(id),
  ])
  const akunOptions = akunList.map(a => ({ id: a.id, nama: a.nama, tipe: a.tipe }))

  if (!data) notFound()

  const isOwner = session?.user.role === 'owner'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/peron">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl font-bold truncate">{data.nama}</h1>
            <Badge variant={data.status === 'aktif' ? 'default' : 'secondary'} className="shrink-0">{data.status}</Badge>
          </div>
          {data.kontak && <p className="text-sm text-muted-foreground">{data.kontak}</p>}
          {data.alamat && <p className="text-sm text-muted-foreground">{data.alamat}</p>}
        </div>
        <div className="flex gap-2">
          <ModalFormDialog peronId={data.id} peronNama={data.nama} akunOptions={akunOptions}>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Mutasi Modal
            </Button>
          </ModalFormDialog>
          <PeronFormDialog mode="edit" peron={data}>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </PeronFormDialog>
        </div>
      </div>

      {/* Info kartu */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">DP/Modal Aktif</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold text-stone-900 dark:text-zinc-50">{formatRupiah(data.dpAktif)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Keuntungan/kg</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold">Rp {data.keuntunganPerKg.toLocaleString('id-ID')}/kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Kode</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold">{data.kode ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Total Mutasi</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold">{data.modal.length} entri</p>
          </CardContent>
        </Card>
      </div>

      {/* Link portal peron (transparansi) */}
      <PortalLinkCard peronId={data.id} peronNama={data.nama} initial={access} />

      {/* Riwayat modal */}
      <ModalHistoryTable modal={data.modal} isOwner={isOwner} />
    </div>
  )
}
