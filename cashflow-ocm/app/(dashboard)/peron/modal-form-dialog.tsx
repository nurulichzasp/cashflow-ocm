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
import { Input } from '@/components/ui/input'
import { addModalPeron } from './actions'
import { todayString } from '@/lib/format'

interface AkunOption { id: string; nama: string; tipe: string }

interface Props {
  peronId: string
  peronNama: string
  akunOptions?: AkunOption[]
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ModalFormDialog({ peronId, peronNama, akunOptions = [], children, open: openProp, onOpenChange }: Props) {
  const [openInternal, setOpenInternal] = useState(false)
  const open = openProp ?? openInternal
  const setOpen = (v: boolean) => { if (onOpenChange) onOpenChange(v); else setOpenInternal(v) }
  const [loading, setLoading] = useState(false)
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID())
  const [jenis, setJenis] = useState<'tambah' | 'kurang' | 'kembali'>('tambah')
  const [jumlah, setJumlah] = useState(0)
  const [akunSumberId, setAkunSumberId] = useState('')
  const showSumberAkun = jenis === 'tambah' || jenis === 'kembali'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!jumlah) { toast.error('Jumlah harus diisi'); return }
    setLoading(true)
    try {
      const fd = new FormData(e.currentTarget)
      fd.set('peronId', peronId)
      fd.set('jenis', jenis)
      fd.set('jumlah', String(jumlah))
      if (akunSumberId) fd.set('akunSumberId', akunSumberId)
      fd.set('idempotencyKey', idemKey)
      await addModalPeron(fd)
      toast.success('Mutasi modal berhasil disimpan')
      setIdemKey(crypto.randomUUID())
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
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Kelola Modal — {peronNama}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Jenis Mutasi</Label>
            <Select value={jenis} onValueChange={(v) => setJenis(v as typeof jenis)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis" />
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
            <Input
              type="date"
              name="tanggal"
              defaultValue={todayString()}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Jumlah (Rp)</Label>
            <NumberInput value={jumlah} onChange={setJumlah} placeholder="0" />
          </div>

          {showSumberAkun && akunOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label>Sumber Akun</Label>
              <Select value={akunSumberId} onValueChange={setAkunSumberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih rekening/kas" />
                </SelectTrigger>
                <SelectContent>
                  {akunOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nama} ({a.tipe})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {jenis === 'tambah' ? 'Uang keluar dari rekening ini ke peron' : 'Uang masuk dari peron ke rekening ini'}
              </p>
            </div>
          )}

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
