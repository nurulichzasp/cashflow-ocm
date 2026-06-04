'use client'

import React, { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatTanggal, formatRupiah } from '@/lib/format'
import { deletePembelian } from './actions'
import { PembelianFormDialog } from './pembelian-form-dialog'
import { PrintRekapButton, PrintNotaButton } from './invoice-print'
import { FotoBuktiGallery } from '@/components/foto-bukti-gallery'
import { Edit3, Trash2, ShoppingCart, ImageIcon } from 'lucide-react'
import type { Pembelian, Peron, AkunKas, PembelianFoto, PembelianDetail } from '@/lib/db/schema'

type PembelianRow = Pembelian & { peron: Peron | null; sumberBayar: AkunKas | null; fotos: PembelianFoto[]; details: PembelianDetail[] }

interface Props {
  pembelianList: PembelianRow[]
  isOwner: boolean
  peronOptions: Array<{ id: string; nama: string; keuntunganPerKg: number }>
  akunOptions: Array<{ id: string; nama: string; tipe: string }>
}

const kategoriBadge: Record<string, string> = {
  'OCM R1':    'bg-blue-50 text-blue-700 border border-blue-200',
  'OCM R2':    'bg-violet-50 text-violet-700 border border-violet-200',
  'OCMP SAGU': 'bg-green-50 text-green-700 border border-green-200',
  'OCM BRDL':  'bg-amber-50 text-amber-700 border border-amber-200',
}

function StatusBayar({ status }: { status: 'lunas' | 'belum' }) {
  if (status === 'lunas') {
    return <span className="inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 border border-green-200">Lunas</span>
  }
  return <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">Belum</span>
}

function FotoIndicator({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-stone-400 font-medium">
      <ImageIcon className="h-3 w-3" />
      {count}
    </span>
  )
}

export function PembelianTable({ pembelianList, isOwner, peronOptions, akunOptions }: Props) {
  const [editTarget, setEditTarget] = useState<PembelianRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filterTanggalDari, setFilterTanggalDari] = useState('')
  const [filterTanggalSampai, setFilterTanggalSampai] = useState('')
  const [filterPeronId, setFilterPeronId] = useState('all')
  const [expandedFotoId, setExpandedFotoId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deletePembelian(id)
      toast.success('Tiket berhasil dihapus')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus tiket')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = useMemo(() => {
    return pembelianList.filter((p) => {
      if (filterTanggalDari && p.tanggal < filterTanggalDari) return false
      if (filterTanggalSampai && p.tanggal > filterTanggalSampai) return false
      if (filterPeronId !== 'all' && p.peronId !== filterPeronId) return false
      return true
    })
  }, [pembelianList, filterTanggalDari, filterTanggalSampai, filterPeronId])

  const totalTonase = filtered.reduce((s, p) => s + p.tonase, 0)
  const totalBeli = filtered.reduce((s, p) => s + p.totalBeli, 0)
  const totalJual = filtered.reduce((s, p) => s + p.totalJual, 0)
  const totalUntung = filtered.reduce((s, p) => s + p.keuntungan, 0)

  if (pembelianList.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100">
            <ShoppingCart className="h-6 w-6 text-stone-400" />
          </div>
          <p className="text-sm font-medium text-stone-700">Belum ada data pembelian</p>
          <p className="text-xs text-stone-400 mt-1">Tambahkan tiket timbang dari peron untuk mulai mencatat.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Edit dialog (tersembunyi, dipicu dari row) */}
      <PembelianFormDialog
        peronOptions={peronOptions}
        akunOptions={akunOptions}
        initialData={editTarget ? {
          id: editTarget.id,
          tanggal: editTarget.tanggal,
          kategori: editTarget.kategori as import('./actions').KategoriPembelian,
          peronId: editTarget.peronId,
          statusBayarPeron: editTarget.statusBayarPeron,
          sumberBayarId: editTarget.sumberBayarId ?? undefined,
          catatan: editTarget.catatan ?? undefined,
          fotoUrls: editTarget.fotos.map((f) => f.url),
          details: editTarget.details.length > 0
            ? editTarget.details.map((d) => ({ noTid: d.noTid ?? undefined, nopol: d.nopol ?? undefined, supir: d.supir ?? undefined, tonase: d.tonase, hargaLapangan: d.hargaLapangan }))
            : [{ tonase: editTarget.tonase, hargaLapangan: editTarget.hargaBeli }],
        } : undefined}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
      >
        <Button variant="outline" size="sm" className="hidden" />
      </PembelianFormDialog>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <p className="text-xs text-stone-500">Dari</p>
          <Input type="date" value={filterTanggalDari} onChange={(e) => setFilterTanggalDari(e.target.value)} className="w-36 h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-stone-500">Sampai</p>
          <Input type="date" value={filterTanggalSampai} onChange={(e) => setFilterTanggalSampai(e.target.value)} className="w-36 h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-stone-500">Peron</p>
          <Select value={filterPeronId} onValueChange={(v) => { if (v) setFilterPeronId(v) }}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Semua Peron" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Peron</SelectItem>
              {peronOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {(filterTanggalDari || filterTanggalSampai || filterPeronId !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-stone-500"
            onClick={() => { setFilterTanggalDari(''); setFilterTanggalSampai(''); setFilterPeronId('all') }}
          >
            Reset Filter
          </Button>
        )}
        <div className="ml-auto">
          <PrintRekapButton pembelianList={filtered} />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Tanggal</th>
              <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">TID</th>
              <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Kat</th>
              <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Peron</th>
              <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Tonase</th>
              <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">H.Jual</th>
              <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">H.Beli</th>
              <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Total Beli</th>
              <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Untung</th>
              <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Status</th>
              <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Foto</th>
              {isOwner && <th className="px-3 py-3 w-20" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map((p) => (
              <React.Fragment key={p.id}>
                <tr className="bg-white hover:bg-orange-50/30 transition-colors group">
                  <td className="px-3 py-2.5 text-stone-700 whitespace-nowrap">{formatTanggal(p.tanggal)}</td>
                  <td className="px-3 py-2.5 text-stone-500 font-mono text-xs">{p.noTid ?? <span className="text-stone-300">—</span>}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${kategoriBadge[p.kategori] ?? ''}`}>
                      {p.kategori}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-stone-900">{p.peron?.nama ?? p.peronId}</td>
                  <td className="px-3 py-2.5 text-right num text-stone-700">{p.tonase.toLocaleString('id-ID')} kg</td>
                  <td className="px-3 py-2.5 text-right num text-stone-600">
                    Rp {p.hargaJual.toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2.5 text-right num text-stone-600">
                    Rp {p.hargaBeli.toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-stone-900 num">{formatRupiah(p.totalBeli)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-green-600 num">{formatRupiah(p.keuntungan)}</td>
                  <td className="px-3 py-2.5"><StatusBayar status={p.statusBayarPeron} /></td>
                  <td className="px-3 py-2.5">
                    {p.fotos.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setExpandedFotoId(expandedFotoId === p.id ? null : p.id)}
                        className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        {p.fotos.length}
                      </button>
                    ) : (
                      <span className="text-stone-300 text-xs">—</span>
                    )}
                  </td>
                  {isOwner && (
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <PrintNotaButton pembelian={p} />
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                          onClick={() => setEditTarget(p)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-stone-400 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus tiket pembelian?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleDelete(p.id)}
                                disabled={deletingId === p.id}
                              >
                                {deletingId === p.id ? 'Menghapus...' : 'Hapus'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  )}
                </tr>
                {expandedFotoId === p.id && p.fotos.length > 0 && (
                  <tr className="bg-orange-50/30">
                    <td colSpan={isOwner ? 12 : 11} className="px-4 py-3">
                      <FotoBuktiGallery urls={p.fotos.map((f) => f.url)} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          {/* Baris total */}
          <tfoot>
            <tr className="bg-stone-100 border-t-2 border-stone-300 font-semibold">
              <td colSpan={4} className="px-3 py-2.5 text-stone-600 text-xs uppercase">
                Total ({filtered.length} tiket)
              </td>
              <td className="px-3 py-2.5 text-right num text-stone-800">
                {totalTonase.toLocaleString('id-ID')} kg
              </td>
              <td colSpan={2} />
              <td className="px-3 py-2.5 text-right num text-stone-900">{formatRupiah(totalBeli)}</td>
              <td className="px-3 py-2.5 text-right num text-green-700">{formatRupiah(totalUntung)}</td>
              <td colSpan={isOwner ? 3 : 2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-xl border border-stone-200 bg-white shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-semibold text-stone-900">{p.peron?.nama ?? p.peronId}</p>
                <p className="text-xs text-stone-500 mt-0.5">{formatTanggal(p.tanggal)}{p.noTid ? ` · ${p.noTid}` : ''}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${kategoriBadge[p.kategori] ?? ''}`}>{p.kategori}</span>
                <StatusBayar status={p.statusBayarPeron} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div className="rounded-lg bg-stone-50 border border-stone-100 p-2">
                <p className="text-xs text-stone-400 mb-0.5">Tonase</p>
                <p className="font-medium num">{p.tonase.toLocaleString('id-ID')} kg</p>
              </div>
              <div className="rounded-lg bg-stone-50 border border-stone-100 p-2">
                <p className="text-xs text-stone-400 mb-0.5">Harga Jual/Beli</p>
                <p className="font-medium num text-xs">
                  Rp {p.hargaJual.toLocaleString('id-ID')} / Rp {p.hargaBeli.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="rounded-lg bg-stone-50 border border-stone-100 p-2">
                <p className="text-xs text-stone-400 mb-0.5">Total Beli</p>
                <p className="font-semibold text-stone-900 num text-sm">{formatRupiah(p.totalBeli)}</p>
              </div>
              <div className="rounded-lg bg-green-50 border border-green-100 p-2">
                <p className="text-xs text-stone-400 mb-0.5">Keuntungan</p>
                <p className="font-bold text-green-600 num text-sm">{formatRupiah(p.keuntungan)}</p>
              </div>
            </div>

            {p.fotos.length > 0 && (
              <div className="mb-3">
                <FotoBuktiGallery urls={p.fotos.map((f) => f.url)} maxThumbnails={3} />
              </div>
            )}

            {isOwner && (
              <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                <PrintNotaButton pembelian={p} />
                <Button
                  variant="outline" size="sm"
                  className="gap-1.5 border-stone-200 text-stone-700 hover:bg-stone-50"
                  onClick={() => setEditTarget(p)}
                >
                  <Edit3 className="h-3.5 w-3.5" />Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5 ml-auto">
                      <Trash2 className="h-3.5 w-3.5" />Hapus
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus tiket pembelian?</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}
                      >
                        {deletingId === p.id ? 'Menghapus...' : 'Hapus'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        ))}

        {/* Mobile total */}
        <div className="rounded-xl border-2 border-stone-300 bg-stone-100 p-4">
          <p className="text-xs font-semibold uppercase text-stone-500 mb-2">Total ({filtered.length} tiket)</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-stone-400">Tonase</p>
              <p className="font-semibold num">{totalTonase.toLocaleString('id-ID')} kg</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Total Beli</p>
              <p className="font-semibold num">{formatRupiah(totalBeli)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Total Jual</p>
              <p className="font-semibold num">{formatRupiah(totalJual)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Keuntungan</p>
              <p className="font-bold text-green-600 num">{formatRupiah(totalUntung)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
