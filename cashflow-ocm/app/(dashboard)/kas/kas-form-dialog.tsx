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
import { createTransaksiKas, updateTransaksiKas } from './actions'
import { todayString } from '@/lib/format'
import type { TransaksiKas } from '@/lib/db/schema'

type KasKategori =
  | 'penerimaan_bga' | 'tarik_bri' | 'bayar_peron' | 'modal_peron'
  | 'kembali_modal' | 'biaya_operasional' | 'penyesuaian' | 'lainnya'

type AkunOption = { id: string; nama: string; tipe: string }

interface Props {
  children?: React.ReactNode
  akunOptions: AkunOption[]
  editItem?: TransaksiKas
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function KasFormDialog({ children, akunOptions, editItem, open: openProp, onOpenChange }: Props) {
  const isEdit = !!editItem
  const [openInternal, setOpenInternal] = useState(false)
  const open = openProp ?? openInternal
  const setOpen = (v: boolean) => { if (onOpenChange) onOpenChange(v); else setOpenInternal(v) }
  const [loading, setLoading] = useState(false)
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID())
  const [akunId, setAkunId] = useState(editItem?.akunId ?? akunOptions?.[0]?.id ?? '')
  const [arah, setArah] = useState<'masuk' | 'keluar'>(editItem?.arah ?? 'masuk')
  const [kategori, setKategori] = useState<KasKategori>(editItem?.kategori ?? 'penerimaan_bga')
  const [jumlah, setJumlah] = useState(editItem?.jumlah ?? 0)
  const [errors, setErrors] = useState<{ jumlah?: string }>({})

  function resetForm() {
    setAkunId(editItem?.akunId ?? akunOptions?.[0]?.id ?? '')
    setArah(editItem?.arah ?? 'masuk')
    setKategori(editItem?.kategori ?? 'penerimaan_bga')
    setJumlah(editItem?.jumlah ?? 0)
    setErrors({})
  }

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
      if (isEdit) {
        await updateTransaksiKas(editItem!.id, formData)
        toast.success('Transaksi kas berhasil diperbarui')
      } else {
        formData.set('idempotencyKey', idemKey)
        await createTransaksiKas(formData)
        toast.success('Transaksi kas berhasil ditambahkan')
        setIdemKey(crypto.randomUUID())
      }
      setOpen(false)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan transaksi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); resetForm() }}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Transaksi Kas' : 'Tambah Transaksi Kas'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tanggal">Tanggal</Label>
              <Input id="tanggal" name="tanggal" type="date" defaultValue={editItem?.tanggal ?? todayString()} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kas-akun">Akun</Label>
              <Select value={akunId} onValueChange={(v) => { if (v) setAkunId(v) }}>
                <SelectTrigger id="kas-akun"><SelectValue placeholder="Pilih akun" /></SelectTrigger>
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
              <Label htmlFor="kas-arah">Arah</Label>
              <Select value={arah} onValueChange={(v) => setArah(v as 'masuk' | 'keluar')}>
                <SelectTrigger id="kas-arah"><SelectValue placeholder="Pilih arah" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masuk">Masuk</SelectItem>
                  <SelectItem value="keluar">Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kas-kategori">Kategori</Label>
              <Select value={kategori} onValueChange={(v) => setKategori(v as KasKategori)}>
                <SelectTrigger id="kas-kategori"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
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
            <Label htmlFor="kas-jumlah">Jumlah (Rp)</Label>
            <NumberInput
              id="kas-jumlah"
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
            <Label htmlFor="kas-catatan">Catatan</Label>
            <Textarea
              id="kas-catatan"
              name="catatan"
              rows={3}
              defaultValue={editItem?.catatan ?? undefined}
              placeholder="Opsional: tujuan atau keterangan singkat"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Transaksi'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
