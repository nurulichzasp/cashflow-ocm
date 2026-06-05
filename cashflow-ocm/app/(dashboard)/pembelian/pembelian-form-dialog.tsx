'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FotoBuktiUploader } from '@/components/foto-bukti-uploader'
import { Textarea } from '@/components/ui/textarea'
import { createPembelian, updatePembelian, type KategoriPembelian, type DetailInput } from './actions'
import { savePembelianFotos, replacePembelianFotos } from './foto-actions'
import { formatRupiah, todayString } from '@/lib/format'
import { Plus, Trash2, CalendarDays } from 'lucide-react'

type PeronOption = { id: string; nama: string; keuntunganPerKg: number }
type AkunOption = { id: string; nama: string; tipe: string }

interface DetailRow {
  noTid: string
  tonase: string
  hargaLapangan: string
  tanggalReplas: string
}

interface Props {
  children: React.ReactNode
  peronOptions: PeronOption[]
  akunOptions: AkunOption[]
  initialData?: {
    id: string
    tanggal: string
    kategori: KategoriPembelian
    peronId: string
    statusBayarPeron: 'belum' | 'lunas'
    sumberBayarId?: string
    catatan?: string
    fotoUrls?: string[]
    details: Array<{ noTid?: string; tonase: number; hargaLapangan: number; tanggalReplas?: string }>
  }
  onOpenChange?: (open: boolean) => void
}

const EMPTY_DETAIL: DetailRow = { noTid: '', tonase: '', hargaLapangan: '', tanggalReplas: '' }

export function PembelianFormDialog({ children, peronOptions, akunOptions, initialData, onOpenChange }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [tanggal, setTanggal] = useState(todayString())
  const [kategori, setKategori] = useState<KategoriPembelian>('OCM R1')
  const [peronId, setPeronId] = useState(peronOptions?.[0]?.id ?? '')
  const [statusBayar, setStatusBayar] = useState<'belum' | 'lunas'>('belum')
  const [sumberBayarId, setSumberBayarId] = useState('')
  const [catatan, setCatatan] = useState('')
  const [fotos, setFotos] = useState<string[]>([])
  const [details, setDetails] = useState<DetailRow[]>([{ ...EMPTY_DETAIL }])

  useEffect(() => {
    if (initialData && open) {
      setTanggal(initialData.tanggal)
      setKategori(initialData.kategori)
      setPeronId(initialData.peronId)
      setStatusBayar(initialData.statusBayarPeron)
      setSumberBayarId(initialData.sumberBayarId ?? '')
      setCatatan(initialData.catatan ?? '')
      setFotos(initialData.fotoUrls ?? [])
      setDetails(
        initialData.details.length > 0
          ? initialData.details.map((d) => ({
              noTid: d.noTid ?? '',
              tonase: String(d.tonase),
              hargaLapangan: String(d.hargaLapangan),
              tanggalReplas: d.tanggalReplas ?? '',
            }))
          : [{ ...EMPTY_DETAIL }]
      )
    }
  }, [initialData, open])

  const selectedPeron = peronOptions.find((p) => p.id === peronId)
  const keuntunganPerKg = selectedPeron?.keuntunganPerKg ?? 0

  function updateDetail(idx: number, field: keyof DetailRow, value: string) {
    setDetails((prev) => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d))
  }

  function addDetail() {
    setDetails((prev) => [...prev, { ...EMPTY_DETAIL }])
  }

  function removeDetail(idx: number) {
    setDetails((prev) => prev.filter((_, i) => i !== idx))
  }

  const parsedDetails = details.map((d) => ({
    tonase: parseFloat(d.tonase) || 0,
    hargaLapangan: parseFloat(d.hargaLapangan) || 0,
  }))
  const totalTonase = parsedDetails.reduce((s, d) => s + d.tonase, 0)
  const totalBeli = parsedDetails.reduce((s, d) => s + d.tonase * d.hargaLapangan, 0)
  const totalJual = parsedDetails.reduce((s, d) => s + d.tonase * (d.hargaLapangan + keuntunganPerKg), 0)
  const totalKeuntungan = totalJual - totalBeli

  function resetForm() {
    setTanggal(todayString())
    setKategori('OCM R1')
    setPeronId(peronOptions?.[0]?.id ?? '')
    setStatusBayar('belum')
    setSumberBayarId('')
    setCatatan('')
    setFotos([])
    setDetails([{ ...EMPTY_DETAIL }])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validDetails = details.filter((d) => parseFloat(d.tonase) > 0 && parseFloat(d.hargaLapangan) > 0)
    if (validDetails.length === 0) {
      toast.error('Minimal 1 baris dengan tonase dan harga yang valid')
      return
    }
    setLoading(true)
    try {
      const detailInputs: DetailInput[] = validDetails.map((d) => ({
        noTid: d.noTid || undefined,
        tonase: parseFloat(d.tonase),
        hargaLapangan: parseFloat(d.hargaLapangan),
        tanggalReplas: d.tanggalReplas || undefined,
      }))

      const payload = {
        tanggal,
        kategori,
        peronId,
        statusBayarPeron: statusBayar,
        sumberBayarId: sumberBayarId || undefined,
        catatan: catatan || undefined,
        details: detailInputs,
      }

      if (initialData?.id) {
        await updatePembelian(initialData.id, payload)
        await replacePembelianFotos(initialData.id, fotos)
        toast.success('Pembelian berhasil diperbarui')
      } else {
        const result = await createPembelian(payload)
        if (result.id && fotos.length > 0) {
          await savePembelianFotos(result.id, fotos)
        }
        toast.success('Pembelian berhasil ditambahkan')
      }

      setOpen(false)
      onOpenChange?.(false)
      if (!initialData) resetForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan pembelian')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); onOpenChange?.(v) }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Pembelian' : 'Tiket Pembelian'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Baris 1: Tanggal full-width mobile, lalu Kategori + Peron */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-1 space-y-1.5">
              <Label>Tanggal *</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori *</Label>
              <Select value={kategori} onValueChange={(v) => setKategori(v as KategoriPembelian)}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OCM R1">OCM R1</SelectItem>
                  <SelectItem value="OCM R2">OCM R2</SelectItem>
                  <SelectItem value="OCMP SAGU">OCMP SAGU</SelectItem>
                  <SelectItem value="OCM BRDL">OCM BRDL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Peron *</Label>
              <Select value={peronId} onValueChange={(v) => { if (v) setPeronId(v) }}>
                <SelectTrigger><SelectValue placeholder="Pilih peron" /></SelectTrigger>
                <SelectContent>
                  {peronOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabel Detail */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Rincian</Label>
            </div>

            <div className="rounded-lg border border-stone-200 overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[2fr_2fr_2fr_auto] gap-0 bg-stone-50 border-b border-stone-200 text-xs font-semibold uppercase text-stone-500 tracking-wide">
                <div className="px-3 py-2">Tonase (kg) *</div>
                <div className="px-3 py-2">Harga (Rp/kg) *</div>
                <div className="px-3 py-2 flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Tgl. Replas
                </div>
                <div className="px-3 py-2 w-10" />
              </div>

              {/* Rows */}
              {details.map((d, idx) => {
                const ton = parseFloat(d.tonase) || 0
                const harga = parseFloat(d.hargaLapangan) || 0
                const subtotal = ton * harga
                return (
                  <div key={idx} className="border-b border-stone-100 last:border-b-0">
                    <div className="grid grid-cols-[2fr_2fr_2fr_auto] gap-0 items-center">
                      <div className="px-2 py-1.5">
                        <Input type="number" step="0.01" value={d.tonase} onChange={(e) => updateDetail(idx, 'tonase', e.target.value)} placeholder="0" className="h-8 text-sm" />
                      </div>
                      <div className="px-2 py-1.5">
                        <Input type="number" value={d.hargaLapangan} onChange={(e) => updateDetail(idx, 'hargaLapangan', e.target.value)} placeholder="0" className="h-8 text-sm" />
                      </div>
                      <div className="px-2 py-1.5">
                        <Input type="date" value={d.tanggalReplas} onChange={(e) => updateDetail(idx, 'tanggalReplas', e.target.value)} className="h-8 text-sm text-stone-500" />
                      </div>
                      <div className="px-2 py-1.5 w-10 flex justify-center">
                        {details.length > 1 && (
                          <button type="button" onClick={() => removeDetail(idx)} className="h-7 w-7 flex items-center justify-center rounded text-stone-400 hover:text-red-500 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {subtotal > 0 && (
                      <div className="px-3 pb-1.5 text-xs text-stone-500 flex gap-4">
                        <span>Subtotal: <span className="font-semibold text-stone-800">{formatRupiah(subtotal)}</span></span>
                        {keuntunganPerKg > 0 && <span>H. BGA: <span className="font-medium">{(harga + keuntunganPerKg).toLocaleString('id-ID')}/kg</span></span>}
                      </div>
                    )}
                  </div>
                )
              })}

              <button
                type="button"
                onClick={addDetail}
                className="w-full px-3 py-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah baris
              </button>
            </div>

            {totalTonase > 0 && (
              <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Total Tonase</p>
                  <p className="font-semibold num">{totalTonase.toLocaleString('id-ID')} kg</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Total Bayar Peron</p>
                  <p className="font-bold text-stone-900 num">{formatRupiah(totalBeli)}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Keuntungan CV OCM</p>
                  <p className="font-bold text-green-600 num">{formatRupiah(totalKeuntungan)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Status bayar + Sumber bayar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status Bayar</Label>
              <Select value={statusBayar} onValueChange={(v) => setStatusBayar(v as 'belum' | 'lunas')}>
                <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="belum">Belum Dibayar</SelectItem>
                  <SelectItem value="lunas">Lunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sumber Bayar</Label>
              <Select value={sumberBayarId} onValueChange={(v) => { if (v) setSumberBayarId(v) }}>
                <SelectTrigger><SelectValue placeholder="— Pilih akun —" /></SelectTrigger>
                <SelectContent>
                  {akunOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Opsional"
            />
          </div>

          {/* Foto Bukti */}
          <div className="space-y-1.5">
            <Label>Foto Bukti</Label>
            <p className="text-xs text-stone-400">Tiket timbang, bukti penyerahan uang, dll.</p>
            <FotoBuktiUploader urls={fotos} onUrlsChange={setFotos} disabled={loading} />
          </div>

          <div className="flex justify-end gap-2 pt-4 -mx-6 px-6 -mb-6 pb-6 border-t border-border bg-muted/30 rounded-b-3xl">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white">
              {loading ? 'Menyimpan...' : initialData ? 'Simpan Perubahan' : 'Tambah Tiket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
