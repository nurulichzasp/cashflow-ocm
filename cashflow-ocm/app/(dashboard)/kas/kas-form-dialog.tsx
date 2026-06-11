'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NumberInput } from '@/components/number-input'
import { Textarea } from '@/components/ui/textarea'
import { FieldError, invalidFieldClass } from '@/components/ui/field-error'
import { cn } from '@/lib/utils'
import { createTransaksiKas } from './actions'
import { todayString } from '@/lib/format'

type KasKategori =
  | 'penerimaan_bga' | 'tarik_bri' | 'bayar_peron' | 'modal_peron'
  | 'kembali_modal' | 'biaya_operasional' | 'penyesuaian' | 'lainnya'

type AkunOption = { id: string; nama: string; tipe: string }

interface Props {
  children: React.ReactNode
  akunOptions: AkunOption[]
}

export function KasFormDialog({ children, akunOptions }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID())
  const [akunId, setAkunId] = useState(akunOptions?.[0]?.id ?? '')
  const [arah, setArah] = useState<'masuk' | 'keluar'>('masuk')
  const [kategori, setKategori] = useState<KasKategori>('penerimaan_bga')
  const [jumlah, setJumlah] = useState(0)
  const [errors, setErrors] = useState<{ jumlah?: string }>({})

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (jumlah <= 0) {
      setErrors({ jumlah: 'Jumlah harus diisi dan lebih besar dari nol.' })
      return
    }
    setErrors({})
    setLoading(true)
    try {
      const formData = new FormData(e.currentTarget)
      formData.set('akunId', akunId)
      formData.set('arah', arah)
      formData.set('kategori', kategori)
      formData.set('jumlah', String(jumlah))
      formData.set('idempotencyKey', idemKey)
      await createTransaksiKas(formData)
      toast.success('Transaksi kas berhasil ditambahkan')
      setIdemKey(crypto.randomUUID())
      setOpen(false)
      setAkunId(akunOptions?.[0]?.id ?? '')
      setArah('masuk')
      setKategori('penerimaan_bga')
      setJumlah(0)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan transaksi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Transaksi Kas</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tanggal">Tanggal</Label>
              <Input id="tanggal" name="tanggal" type="date" defaultValue={todayString()} required />
            </div>
            <div className="space-y-1.5">
              <Label>Akun</Label>
              <Select value={akunId} onValueChange={(v) => { if (v) setAkunId(v) }}>
                <SelectTrigger><SelectValue placeholder="Pilih akun" /></SelectTrigger>
                <SelectContent>
                  {akunOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Arah</Label>
              <Select value={arah} onValueChange={(v) => setArah(v as 'masuk' | 'keluar')}>
                <SelectTrigger><SelectValue placeholder="Pilih arah" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masuk">Masuk</SelectItem>
                  <SelectItem value="keluar">Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={kategori} onValueChange={(v) => setKategori(v as KasKategori)}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="penerimaan_bga">Penerimaan Penjualan</SelectItem>
                  <SelectItem value="tarik_bri">Tarik / Transfer</SelectItem>
                  <SelectItem value="bayar_peron">Bayar Peron</SelectItem>
                  <SelectItem value="modal_peron">Modal Peron</SelectItem>
                  <SelectItem value="kembali_modal">Kembali Modal</SelectItem>
                  <SelectItem value="biaya_operasional">Biaya Operasional</SelectItem>
                  <SelectItem value="penyesuaian">Penyesuaian</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Jumlah (Rp)</Label>
            <NumberInput
              name="jumlah"
              value={jumlah}
              onChange={(v) => { setJumlah(v); if (errors.jumlah) setErrors({}) }}
              placeholder="0"
              aria-invalid={!!errors.jumlah}
              className={cn(errors.jumlah && invalidFieldClass)}
            />
            <FieldError>{errors.jumlah}</FieldError>
          </div>

          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea
              name="catatan"
              rows={3}
              placeholder="Opsional: tujuan atau keterangan singkat"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Tambah Transaksi'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
