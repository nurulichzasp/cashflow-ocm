'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NumberInput } from '@/components/number-input'
import { Textarea } from '@/components/ui/textarea'
import { createHargaAcuan } from './actions'
import { todayString } from '@/lib/format'

type Produk = 'TBS' | 'BRDL KTWM' | 'BRDL TRYM' | 'BRDL LMDM'

interface Props {
  children: React.ReactNode
}

export function HargaFormDialog({ children }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [produk, setProduk] = useState<Produk>('TBS')
  const [hargaLapangan, setHargaLapangan] = useState(0)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!hargaLapangan) { toast.error('Harga lapangan wajib diisi'); return }
    setLoading(true)
    try {
      const fd = new FormData(e.currentTarget)
      fd.set('produk', produk)
      fd.set('hargaLapangan', String(hargaLapangan))
      await createHargaAcuan(fd)
      toast.success('Harga acuan berhasil ditambahkan')
      setOpen(false)
      setHargaLapangan(0)
      setProduk('TBS')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tambah Harga Acuan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Produk</Label>
              <Select value={produk} onValueChange={(v) => setProduk(v as Produk)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TBS">TBS</SelectItem>
                  <SelectItem value="BRDL KTWM">BRDL KTWM</SelectItem>
                  <SelectItem value="BRDL TRYM">BRDL TRYM</SelectItem>
                  <SelectItem value="BRDL LMDM">BRDL LMDM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Berlaku</Label>
              <Input
                type="date"
                name="tanggalBerlaku"
                defaultValue={todayString()}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Harga Lapangan (Rp/kg)</Label>
            <NumberInput value={hargaLapangan} onChange={setHargaLapangan} placeholder="0" />
            <p className="text-xs text-muted-foreground">Harga acuan dari lapangan/pasar</p>
          </div>

          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea name="catatan" placeholder="Opsional..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Tambah'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
