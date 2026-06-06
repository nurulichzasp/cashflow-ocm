'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NumberInput } from '@/components/number-input'
import { FotoBuktiUploader } from '@/components/foto-bukti-uploader'
import { Textarea } from '@/components/ui/textarea'
import { createBiayaOperasional } from './actions'
import { saveBiayaFotos } from './foto-actions'
import { todayString } from '@/lib/format'

type BiayaKategori = 'gaji' | 'solar' | 'transport' | 'lainnya'
type AkunOption = { id: string; nama: string; tipe: string }

type Props = {
  children: React.ReactNode
  akunOptions: AkunOption[]
}

export function BiayaFormDialog({ children, akunOptions }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [kategori, setKategori] = useState<BiayaKategori>('gaji')
  const [akunSumberId, setAkunSumberId] = useState(akunOptions?.[0]?.id ?? '')
  const [jumlah, setJumlah] = useState(0)
  const [fotos, setFotos] = useState<string[]>([])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (jumlah <= 0) {
      toast.error('Jumlah harus diisi dan lebih besar dari nol')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData(e.currentTarget)
      formData.set('kategori', kategori)
      formData.set('akunSumberId', akunSumberId)
      formData.set('jumlah', String(jumlah))

      const result = await createBiayaOperasional(formData)
      if (result.id && fotos.length > 0) {
        await saveBiayaFotos(result.id, fotos)
      }

      toast.success('Biaya operasional berhasil ditambahkan')
      setOpen(false)
      setKategori('gaji')
      setAkunSumberId(akunOptions?.[0]?.id ?? '')
      setJumlah(0)
      setFotos([])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan biaya')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Biaya Operasional</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tanggal">Tanggal</Label>
              <Input id="tanggal" name="tanggal" type="date" defaultValue={todayString()} required />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={kategori} onValueChange={(v) => setKategori(v as BiayaKategori)}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gaji">Gaji</SelectItem>
                  <SelectItem value="solar">Solar</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Akun Sumber</Label>
              <Select value={akunSumberId} onValueChange={(v) => { if (v) setAkunSumberId(v) }}>
                <SelectTrigger><SelectValue placeholder="Pilih akun" /></SelectTrigger>
                <SelectContent>
                  {akunOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Jumlah (Rp)</Label>
              <NumberInput name="jumlah" value={jumlah} onChange={setJumlah} placeholder="0" className="glow-keluar" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea
              name="catatan"
              rows={3}
              placeholder="Opsional"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Foto Nota / Kwitansi</Label>
            <p className="text-xs text-stone-400">Lampirkan foto bukti pengeluaran.</p>
            <FotoBuktiUploader urls={fotos} onUrlsChange={setFotos} disabled={loading} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Tambah Biaya'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
