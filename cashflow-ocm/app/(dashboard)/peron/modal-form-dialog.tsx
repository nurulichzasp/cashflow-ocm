'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NumberInput } from '@/components/number-input'
import { Textarea } from '@/components/ui/textarea'
import { addModalPeron } from './actions'
import { todayString } from '@/lib/format'

interface Props {
  peronId: string
  peronNama: string
  children: React.ReactNode
}

export function ModalFormDialog({ peronId, peronNama, children }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [jenis, setJenis] = useState<'tambah' | 'kurang' | 'kembali'>('tambah')
  const [jumlah, setJumlah] = useState(0)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!jumlah) { toast.error('Jumlah harus diisi'); return }
    setLoading(true)
    try {
      const fd = new FormData(e.currentTarget)
      fd.set('peronId', peronId)
      fd.set('jenis', jenis)
      fd.set('jumlah', String(jumlah))
      await addModalPeron(fd)
      toast.success('Mutasi modal berhasil disimpan')
      setOpen(false)
      setJumlah(0)
      setJenis('tambah')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const jenisLabel: Record<string, string> = {
    tambah: 'Penambahan DP/Modal',
    kurang: 'Pengurangan Modal',
    kembali: 'Modal Dikembalikan',
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Kelola Modal — {peronNama}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Jenis Mutasi</Label>
            <Select value={jenis} onValueChange={(v) => setJenis(v as typeof jenis)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tambah">Tambah DP / Modal Baru</SelectItem>
                <SelectItem value="kurang">Kurang Modal</SelectItem>
                <SelectItem value="kembali">Modal Dikembalikan</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{jenisLabel[jenis]}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Tanggal</Label>
            <input
              type="date"
              name="tanggal"
              defaultValue={todayString()}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Jumlah (Rp)</Label>
            <NumberInput value={jumlah} onChange={setJumlah} placeholder="0" />
          </div>

          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea name="catatan" placeholder="Opsional..." rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
