'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NumberInput } from '@/components/number-input'
import { createPeron, updatePeron } from './actions'
import type { Peron } from '@/lib/db/schema'

interface Props {
  mode: 'create' | 'edit'
  peron?: Peron
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function PeronFormDialog({ mode, peron, children, open: openProp, onOpenChange }: Props) {
  const [openInternal, setOpenInternal] = useState(false)
  const open = openProp ?? openInternal
  const setOpen = (v: boolean) => { onOpenChange ? onOpenChange(v) : setOpenInternal(v) }
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'aktif' | 'nonaktif'>(peron?.status ?? 'aktif')
  const [keuntunganPerKg, setKeuntunganPerKg] = useState(peron?.keuntunganPerKg ?? 50)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const fd = new FormData(e.currentTarget)
      fd.set('status', status)
      fd.set('keuntunganPerKg', String(keuntunganPerKg))

      if (mode === 'create') {
        await createPeron(fd)
        toast.success('Peron berhasil ditambahkan')
        formRef.current?.reset()
        setKeuntunganPerKg(50)
        setStatus('aktif')
      } else {
        await updatePeron(peron!.id, fd)
        toast.success('Data peron berhasil diperbarui')
      }
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Tambah Peron Baru' : 'Edit Data Peron'}</DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="kode">Kode</Label>
              <Input id="kode" name="kode" type="number" defaultValue={peron?.kode ?? ''} placeholder="Opsional" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'aktif' | 'nonaktif')}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="nonaktif">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nama">Nama Peron *</Label>
            <Input id="nama" name="nama" required defaultValue={peron?.nama} placeholder="Nama lengkap" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="kontak">Kontak</Label>
              <Input id="kontak" name="kontak" defaultValue={peron?.kontak ?? ''} placeholder="No. HP" />
            </div>
            <div className="space-y-1.5">
              <Label>Keuntungan/kg (Rp)</Label>
              <NumberInput value={keuntunganPerKg} onChange={setKeuntunganPerKg} placeholder="50" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alamat">Alamat</Label>
            <Input id="alamat" name="alamat" defaultValue={peron?.alamat ?? ''} placeholder="Alamat / lokasi" />
          </div>

          {keuntunganPerKg > 0 && (
            <div className="rounded-lg bg-stone-50 dark:bg-white/[0.03] border border-stone-200 dark:border-border px-3 py-2 text-xs text-stone-500 dark:text-stone-400">
              Kelebihan peron: <strong className="text-stone-700 dark:text-stone-200">Rp {(120 - keuntunganPerKg).toLocaleString('id-ID')}/kg</strong>
              <span className="text-stone-400 ml-1">(selisih jual 120 - untung {keuntunganPerKg})</span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : mode === 'create' ? 'Tambah' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
