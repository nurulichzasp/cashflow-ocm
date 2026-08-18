'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Fuel, Pencil, Plus, ReceiptText, Trash2, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangeFilter } from '@/components/date-range-filter'
import { RowActionMenu, type RowAction } from '@/components/ui/row-action-menu'
import { formatCompact, formatNumber, formatRentangFilter, formatRupiah, formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'
import { hitungKeuntunganPrah, PRAH_TRUK, PRAH_TRUK_LABEL, type PrahTruk } from '@/lib/prah-trek'
import type { PrahAngkutan, PrahBbm } from '@/lib/db/schema'
import { deletePrahAngkutan, deletePrahBbm } from './actions'
import { PrahFormDialog } from './prah-form-dialog'
import { BbmFormDialog } from './bbm-form-dialog'
import { BastFormDialog } from './bast-form-dialog'

type FilterTruk = 'semua' | PrahTruk

function inRange(tanggal: string, dari: string, sampai: string) {
  return (!dari || tanggal >= dari) && (!sampai || tanggal <= sampai)
}

function summarize(angkutan: PrahAngkutan[], bbm: PrahBbm[]) {
  const pendapatan = angkutan.reduce((sum, item) => sum + item.pendapatan, 0)
  const biayaSopir = angkutan.reduce((sum, item) => sum + item.biayaSopir, 0)
  const biayaBbm = bbm.reduce((sum, item) => sum + item.biayaTotal, 0)
  const jumlahKen = bbm.reduce((sum, item) => sum + item.jumlahKen, 0)
  const tonaseKotor = angkutan.reduce((sum, item) => sum + item.tonaseKotor, 0)
  const tonaseNetto1 = angkutan.reduce((sum, item) => sum + item.tonaseNetto1, 0)
  return {
    jumlahPrah: angkutan.length,
    pendapatan,
    biayaSopir,
    biayaBbm,
    jumlahKen,
    tonaseKotor,
    tonaseNetto1,
    keuntungan: hitungKeuntunganPrah({ pendapatan, biayaSopir, biayaBbm }),
  }
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="surface min-w-0 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">{label}</p>
      <p className="mt-2 truncate text-lg font-bold text-stone-900 dark:text-zinc-50 num">{value}</p>
      {detail && <p className="mt-1 truncate text-xs text-stone-500">{detail}</p>}
    </div>
  )
}

function AngkutanActions({ item, deletingId, onDelete }: {
  item: PrahAngkutan
  deletingId: string | null
  onDelete: (id: string) => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const actions: RowAction[] = [
    { key: 'edit', label: 'Edit', icon: Pencil, onSelect: () => setEditOpen(true) },
    {
      key: 'delete',
      label: 'Hapus',
      icon: Trash2,
      destructive: true,
      separated: true,
      onSelect: () => onDelete(item.id),
      confirm: {
        title: 'Hapus catatan prah?',
        description: `Prah ${PRAH_TRUK_LABEL[item.truk]} pada ${formatTanggal(item.tanggal)} akan dihapus.`,
        confirmLabel: 'Hapus',
        busyLabel: 'Menghapus…',
        busy: deletingId === item.id,
      },
    },
  ]
  return (
    <>
      <div className="md:hidden">
        <RowActionMenu variant="sheet" title={`Prah ${PRAH_TRUK_LABEL[item.truk]}`} subtitle={formatTanggal(item.tanggal)} actions={actions} />
      </div>
      <div className="hidden md:block"><RowActionMenu variant="menu" actions={actions} /></div>
      {editOpen && <PrahFormDialog editItem={item} open={editOpen} onOpenChange={setEditOpen} />}
    </>
  )
}

function BbmActions({ item, deletingId, onDelete }: {
  item: PrahBbm
  deletingId: string | null
  onDelete: (id: string) => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const actions: RowAction[] = [
    { key: 'edit', label: 'Edit', icon: Pencil, onSelect: () => setEditOpen(true) },
    {
      key: 'delete',
      label: 'Hapus',
      icon: Trash2,
      destructive: true,
      separated: true,
      onSelect: () => onDelete(item.id),
      confirm: {
        title: 'Hapus catatan BBM?',
        description: `${item.jumlahKen} ken untuk ${PRAH_TRUK_LABEL[item.truk]} pada ${formatTanggal(item.tanggal)} akan dihapus.`,
        confirmLabel: 'Hapus',
        busyLabel: 'Menghapus…',
        busy: deletingId === item.id,
      },
    },
  ]
  return (
    <>
      <div className="md:hidden">
        <RowActionMenu variant="sheet" title={`BBM ${PRAH_TRUK_LABEL[item.truk]}`} subtitle={formatTanggal(item.tanggal)} actions={actions} />
      </div>
      <div className="hidden md:block"><RowActionMenu variant="menu" actions={actions} /></div>
      {editOpen && <BbmFormDialog editItem={item} open={editOpen} onOpenChange={setEditOpen} />}
    </>
  )
}

export function PrahTrekClient({
  initialAngkutan,
  initialBbm,
}: {
  initialAngkutan: PrahAngkutan[]
  initialBbm: PrahBbm[]
}) {
  const [tab, setTab] = useState<'prah' | 'bbm'>('prah')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [truk, setTruk] = useState<FilterTruk>('semua')
  const [deletingPrah, setDeletingPrah] = useState<string | null>(null)
  const [deletingBbm, setDeletingBbm] = useState<string | null>(null)

  const filteredAngkutan = useMemo(() => initialAngkutan.filter((item) =>
    inRange(item.tanggal, dari, sampai) && (truk === 'semua' || item.truk === truk),
  ), [initialAngkutan, dari, sampai, truk])
  const filteredBbm = useMemo(() => initialBbm.filter((item) =>
    inRange(item.tanggal, dari, sampai) && (truk === 'semua' || item.truk === truk),
  ), [initialBbm, dari, sampai, truk])
  const total = useMemo(() => summarize(filteredAngkutan, filteredBbm), [filteredAngkutan, filteredBbm])
  const perTruk = useMemo(() => Object.fromEntries(PRAH_TRUK.map((key) => [
    key,
    summarize(
      filteredAngkutan.filter((item) => item.truk === key),
      filteredBbm.filter((item) => item.truk === key),
    ),
  ])) as Record<PrahTruk, ReturnType<typeof summarize>>, [filteredAngkutan, filteredBbm])

  async function handleDeletePrah(id: string) {
    setDeletingPrah(id)
    try {
      await deletePrahAngkutan(id)
      toast.success('Catatan prah dihapus')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus prah')
    } finally {
      setDeletingPrah(null)
    }
  }

  async function handleDeleteBbm(id: string) {
    setDeletingBbm(id)
    try {
      await deletePrahBbm(id)
      toast.success('Catatan BBM dihapus')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus BBM')
    } finally {
      setDeletingBbm(null)
    }
  }

  const periodLabel = formatRentangFilter(dari, sampai) || 'semua waktu'

  return (
    <div className="space-y-5 pb-4">
      <section className="overflow-hidden rounded-2xl bg-[#1E1E1E] p-5 text-white shadow-sm md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-orange-400" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Prah Trek · Aset Pribadi</p>
            </div>
            <p className="mt-3 text-sm text-zinc-400">Keuntungan {periodLabel}</p>
            <p className={cn('mt-1 text-3xl font-bold tracking-tight num', total.keuntungan < 0 ? 'text-red-300' : 'text-white')}>
              {formatRupiah(total.keuntungan)}
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
            Di luar OCM
          </span>
        </div>
        <div className="mt-5 border-t border-white/[0.08] pt-3 text-xs text-zinc-400">
          {formatRupiah(total.pendapatan)} pendapatan − {formatRupiah(total.biayaBbm)} BBM − {formatRupiah(total.biayaSopir)} sopir
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <PrahFormDialog>
            <Button><Plus className="h-4 w-4" /> Catat Prah</Button>
          </PrahFormDialog>
          <BbmFormDialog>
            <Button variant="outline"><Fuel className="h-4 w-4" /> Isi BBM</Button>
          </BbmFormDialog>
          <BastFormDialog>
            <Button variant="outline"><ReceiptText className="h-4 w-4" /> Input BAST</Button>
          </BastFormDialog>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <Select value={truk} onValueChange={(value) => setTruk(value as FilterTruk)}>
            <SelectTrigger className="h-9 w-full text-xs sm:w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua truk</SelectItem>
              {PRAH_TRUK.map((key) => <SelectItem key={key} value={key}>{PRAH_TRUK_LABEL[key]}</SelectItem>)}
            </SelectContent>
          </Select>
          <DateRangeFilter dari={dari} sampai={sampai} onChange={(nextDari, nextSampai) => { setDari(nextDari); setSampai(nextSampai) }} />
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Jumlah Prah" value={`${formatNumber(total.jumlahPrah)} prah`} detail={`${formatNumber(total.tonaseKotor)} kg kotor`} />
        <Metric label="Pendapatan" value={formatCompact(total.pendapatan)} detail="Rp140 × tonase kotor" />
        <Metric label="BBM" value={formatCompact(total.biayaBbm)} detail={`${formatNumber(total.jumlahKen)} ken`} />
        <Metric label="Biaya Sopir" value={formatCompact(total.biayaSopir)} detail="Rp200 rb × jumlah prah" />
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {PRAH_TRUK.map((key) => {
          const stats = perTruk[key]
          return (
            <div key={key} className="surface p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-stone-100 dark:bg-white/[0.06]"><Truck className="h-4 w-4" /></div>
                  <div>
                    <p className="font-semibold">{PRAH_TRUK_LABEL[key]}</p>
                    <p className="text-xs text-stone-400">{stats.jumlahPrah} prah · {stats.jumlahKen} ken</p>
                  </div>
                </div>
                <p className={cn('font-bold num', stats.keuntungan < 0 ? 'text-red-600 dark:text-red-300' : 'text-stone-900 dark:text-zinc-50')}>
                  {formatCompact(stats.keuntungan)}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-stone-100 pt-3 text-xs dark:border-white/[0.06]">
                <div><p className="text-stone-400">Kotor</p><p className="mt-0.5 font-medium num">{formatNumber(stats.tonaseKotor)} kg</p></div>
                <div><p className="text-stone-400">Netto 1</p><p className="mt-0.5 font-medium num">{formatNumber(stats.tonaseNetto1)} kg</p></div>
                <div><p className="text-stone-400">Prah / ken</p><p className="mt-0.5 font-medium num">{stats.jumlahKen ? (stats.jumlahPrah / stats.jumlahKen).toLocaleString('id-ID', { maximumFractionDigits: 1 }) : '—'}</p></div>
              </div>
            </div>
          )
        })}
      </section>

      <section className="space-y-3">
        <div className="flex items-center rounded-xl bg-stone-100 p-1 dark:bg-white/[0.06]">
          <button
            type="button"
            onClick={() => setTab('prah')}
            className={cn('h-10 flex-1 rounded-lg text-sm font-medium transition-colors', tab === 'prah' ? 'bg-white text-stone-900 shadow-sm dark:bg-white/[0.12] dark:text-white' : 'text-stone-500')}
          >
            Riwayat Prah ({filteredAngkutan.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('bbm')}
            className={cn('h-10 flex-1 rounded-lg text-sm font-medium transition-colors', tab === 'bbm' ? 'bg-white text-stone-900 shadow-sm dark:bg-white/[0.12] dark:text-white' : 'text-stone-500')}
          >
            Pengisian BBM ({filteredBbm.length})
          </button>
        </div>

        {tab === 'prah' ? (
          filteredAngkutan.length ? (
            <div className="surface divide-y divide-stone-100 overflow-hidden dark:divide-white/[0.06]">
              {filteredAngkutan.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 p-4 md:grid-cols-[130px_100px_1fr_1fr_150px_36px] md:items-center">
                  <div>
                    <p className="text-sm font-medium">{formatTanggal(item.tanggal)}</p>
                    <p className="mt-0.5 text-xs text-stone-400 md:hidden">{PRAH_TRUK_LABEL[item.truk]} · Peron {item.peronMuat}{item.noBast ? ` · BAST ${item.noBast}` : ''}</p>
                  </div>
                  <div className="row-span-2 md:row-span-1"><AngkutanActions item={item} deletingId={deletingPrah} onDelete={handleDeletePrah} /></div>
                  <p className="hidden text-sm font-medium md:block">{PRAH_TRUK_LABEL[item.truk]}</p>
                  <div className="text-xs text-stone-500 md:text-sm">
                    <span className="font-medium text-stone-900 dark:text-zinc-100 num">{formatNumber(item.tonaseKotor)} kg</span> kotor
                    <span className="mx-1.5 text-stone-300">·</span>{formatNumber(item.tonaseNetto1)} kg netto 1
                  </div>
                  <p className="hidden truncate text-sm text-stone-500 md:block">Peron {item.peronMuat}{item.noBast ? ` · BAST ${item.noBast}` : ''}{item.noTid ? ` · ${item.noTid}` : ''}</p>
                  <div className="text-left md:text-right">
                    <p className="font-semibold num">{formatRupiah(item.pendapatan)}</p>
                    <p className="text-[11px] text-stone-400">sebelum BBM · sopir {formatRupiah(item.biayaSopir)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="surface flex flex-col items-center py-12 text-center">
              <ReceiptText className="h-8 w-8 text-stone-300" />
              <p className="mt-3 font-medium">Belum ada prah pada filter ini</p>
              <p className="mt-1 text-sm text-stone-400">Catat satu perjalanan untuk mulai menghitung pendapatan.</p>
            </div>
          )
        ) : filteredBbm.length ? (
          <div className="surface divide-y divide-stone-100 overflow-hidden dark:divide-white/[0.06]">
            {filteredBbm.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 p-4 md:grid-cols-[130px_100px_120px_1fr_150px_36px] md:items-center">
                <div>
                  <p className="text-sm font-medium">{formatTanggal(item.tanggal)}</p>
                  <p className="mt-0.5 text-xs text-stone-400 md:hidden">{PRAH_TRUK_LABEL[item.truk]}</p>
                </div>
                <div className="row-span-2 md:row-span-1"><BbmActions item={item} deletingId={deletingBbm} onDelete={handleDeleteBbm} /></div>
                <p className="hidden text-sm font-medium md:block">{PRAH_TRUK_LABEL[item.truk]}</p>
                <div><span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold dark:bg-white/[0.07]">{item.jumlahKen} ken</span></div>
                <p className="hidden truncate text-sm text-stone-500 md:block">{item.catatan || '—'}</p>
                <div className="text-left md:text-right">
                  <p className="font-semibold num">{formatRupiah(item.biayaTotal)}</p>
                  <p className="text-[11px] text-stone-400">{formatRupiah(Math.round(item.biayaTotal / item.jumlahKen))} / ken</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface flex flex-col items-center py-12 text-center">
            <Fuel className="h-8 w-8 text-stone-300" />
            <p className="mt-3 font-medium">Belum ada pengisian BBM pada filter ini</p>
            <p className="mt-1 text-sm text-stone-400">Catat jumlah ken dan biaya total setiap kali mengisi.</p>
          </div>
        )}
      </section>
    </div>
  )
}
