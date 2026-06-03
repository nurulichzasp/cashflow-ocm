'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createPenjualan } from './actions'
import { todayString } from '@/lib/format'

type Props = {
  children: React.ReactNode
}

export function PenjualanFormDialog({ children }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statusBayar, setStatusBayar] = useState<'belum' | 'lunas'>('belum')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      formData.set('statusBayar', statusBayar)
      await createPenjualan(formData)
      toast.success('Penjualan berhasil ditambahkan')
      setOpen(false)
      setStatusBayar('belum')
      e.currentTarget.reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan penjualan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Penjualan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="tanggal">Tanggal</Label>
            <Input id="tanggal" name="tanggal" type="date" defaultValue={todayString()} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="noBast">No. BAST</Label>
              <Input id="noBast" name="noBast" placeholder="Opsional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="noInvoice">No. Invoice</Label>
              <Input id="noInvoice" name="noInvoice" placeholder="Opsional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status Bayar</Label>
              <Select value={statusBayar} onValueChange={(value) => setStatusBayar(value as 'belum' | 'lunas')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="belum">Belum</SelectItem>
                  <SelectItem value="lunas">Lunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tanggalBayarBga">Tanggal Bayar BGA</Label>
              <Input id="tanggalBayarBga" name="tanggalBayarBga" type="date" disabled={statusBayar === 'belum'} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <textarea
              name="catatan"
              rows={3}
              className="min-h-[5rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Opsional: catatan singkat untuk invoice"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Tambah Penjualan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
