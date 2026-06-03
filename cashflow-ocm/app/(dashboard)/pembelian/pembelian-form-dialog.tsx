'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FotoBuktiUploader } from '@/components/foto-bukti-uploader'
import { createPembelian, updatePembelian } from './actions'
import { savePembelianFotos, replacePembelianFotos } from './foto-actions'
import { formatRupiah, todayString } from '@/lib/format'

type PeronOption = { id: string; nama: string; keuntunganPerKg: number }
type AkunOption = { id: string; nama: string; tipe: string }

interface Props {
  children: React.ReactNode
  peronOptions: PeronOption[]
  akunOptions: AkunOption[]
  initialData?: {
    id: string
    tanggal: string
    noTid?: string
    kategori: 'RING 1' | 'RING 2' | 'BRDL'
    peronId: string
    nopol?: string
    supir?: string
    tonase: number
    hargaJual: number
    statusBayarPeron: 'belum' | 'lunas'
    sumberBayarId?: string
    catatan?: string
    fotoUrls?: string[]
  }
  onOpenChange?: (open: boolean) => void
}

export function PembelianFormDialog({ children, peronOptions, akunOptions, initialData, onOpenChange }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [tanggal, setTanggal] = useState(todayString())
  const [noTid, setNoTid] = useState('')
  const [kategori, setKategori] = useState<'RING 1' | 'RING 2' | 'BRDL'>('RING 1')
  const [peronId, setPeronId] = useState(peronOptions?.[0]?.id ?? '')
  const [nopol, setNopol] = useState('')
  const [supir, setSupir] = useState('')
  const [tonase, setTonase] = useState('')
  const [hargaJual, setHargaJual] = useState('')
  const [statusBayar, setStatusBayar] = useState<'belum' | 'lunas'>('belum')
  const [sumberBayarId, setSumberBayarId] = useState('')
  const [catatan, setCatatan] = useState('')
  const [fotos, setFotos] = useState<string[]>([])

  useEffect(() => {
    if (initialData && open) {
      setTanggal(initialData.tanggal)
      setNoTid(initialData.noTid ?? '')
      setKategori(initialData.kategori)
      setPeronId(initialData.peronId)
      setNopol(initialData.nopol ?? '')
      setSupir(initialData.supir ?? '')
      setTonase(String(initialData.tonase))
      setHargaJual(String(initialData.hargaJual))
      setStatusBayar(initialData.statusBayarPeron)
      setSumberBayarId(initialData.sumberBayarId ?? '')
      setCatatan(initialData.catatan ?? '')
      setFotos(initialData.fotoUrls ?? [])
    }
  }, [initialData, open])

  const selectedPeron = peronOptions.find((p) => p.id === peronId)
  const keuntunganPerKg = selectedPeron?.keuntunganPerKg ?? 0
  const tonaseNum = parseFloat(tonase) || 0
  const hargaJualNum = parseFloat(hargaJual) || 0
  const hargaBeli = hargaJualNum - keuntunganPerKg
  const totalJual = tonaseNum * hargaJualNum
  const totalBeli = tonaseNum * hargaBeli
  const keuntungan = totalJual - totalBeli

  function resetForm() {
    setTanggal(todayString())
    setNoTid('')
    setKategori('RING 1')
    setPeronId(peronOptions?.[0]?.id ?? '')
    setNopol('')
    setSupir('')
    setTonase('')
    setHargaJual('')
    setStatusBayar('belum')
    setSumberBayarId('')
    setCatatan('')
    setFotos([])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (tonaseNum <= 0 || hargaJualNum <= 0) {
      toast.error('Tonase dan harga jual harus diisi')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.set('tanggal', tanggal)
      if (noTid) fd.set('noTid', noTid)
      fd.set('kategori', kategori)
      fd.set('peronId', peronId)
      if (nopol) fd.set('nopol', nopol)
      if (supir) fd.set('supir', supir)
      fd.set('tonase', String(tonaseNum))
      fd.set('hargaJual', String(hargaJualNum))
      fd.set('statusBayarPeron', statusBayar)
      if (sumberBayarId) fd.set('sumberBayarId', sumberBayarId)
      if (catatan) fd.set('catatan', catatan)

      if (initialData?.id) {
        await updatePembelian(initialData.id, fd)
        await replacePembelianFotos(initialData.id, fotos)
        toast.success('Pembelian berhasil diperbarui')
      } else {
        const result = await createPembelian(fd)
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
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v)
      onOpenChange?.(v)
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Tiket Pembelian' : 'Tambah Tiket Pembelian'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Baris 1: Tanggal, Kategori, Peron */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tanggal">Tanggal *</Label>
              <Input id="tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori *</Label>
              <Select value={kategori} onValueChange={(v) => setKategori(v as typeof kategori)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RING 1">RING 1</SelectItem>
                  <SelectItem value="RING 2">RING 2</SelectItem>
                  <SelectItem value="BRDL">BRDL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Peron *</Label>
              <Select value={peronId} onValueChange={(v) => { if (v) setPeronId(v) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {peronOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Baris 2: No TID, Nopol, Supir */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="noTid">No. TID</Label>
              <Input id="noTid" value={noTid} onChange={(e) => setNoTid(e.target.value)} placeholder="GR0600023053" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nopol">Plat Truk</Label>
              <Input id="nopol" value={nopol} onChange={(e) => setNopol(e.target.value)} placeholder="KB 1234 AB" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supir">Supir</Label>
              <Input id="supir" value={supir} onChange={(e) => setSupir(e.target.value)} placeholder="Nama supir" />
            </div>
          </div>

          {/* Baris 3: Tonase + Harga Jual */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tonase">Tonase (kg) *</Label>
              <Input
                id="tonase"
                type="number"
                step="0.01"
                value={tonase}
                onChange={(e) => setTonase(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hargaJual">Harga Jual BGA (Rp/kg) *</Label>
              <Input
                id="hargaJual"
                type="number"
                value={hargaJual}
                onChange={(e) => setHargaJual(e.target.value)}
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Kalkulasi otomatis */}
          {hargaJualNum > 0 && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Kalkulasi Otomatis</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Untung/kg Peron</p>
                  <p className="font-medium text-stone-700 num">Rp {keuntunganPerKg.toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Harga Beli</p>
                  <p className="font-semibold text-stone-900 num">Rp {hargaBeli.toLocaleString('id-ID')}/kg</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Total Beli (dibayar)</p>
                  <p className="font-semibold text-red-600 num">{formatRupiah(totalBeli)}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Keuntungan</p>
                  <p className="font-bold text-green-600 num">{formatRupiah(keuntungan)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Status bayar + Sumber bayar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status Bayar Peron</Label>
              <Select value={statusBayar} onValueChange={(v) => setStatusBayar(v as 'belum' | 'lunas')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Label htmlFor="catatan">Catatan</Label>
            <textarea
              id="catatan"
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="min-h-[3rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              placeholder="Opsional"
            />
          </div>

          {/* Foto Bukti */}
          <div className="space-y-1.5">
            <Label>Foto Bukti</Label>
            <p className="text-xs text-stone-400">Tiket timbang, bukti penyerahan uang, dll.</p>
            <FotoBuktiUploader urls={fotos} onUrlsChange={setFotos} disabled={loading} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
