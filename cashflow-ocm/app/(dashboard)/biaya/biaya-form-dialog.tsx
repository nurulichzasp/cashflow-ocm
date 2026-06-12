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
import { FieldError, invalidFieldClass } from '@/components/ui/field-error'
import { cn } from '@/lib/utils'
import { createBiayaOperasional, updateBiayaOperasional } from './actions'
import { todayString } from '@/lib/format'

type BiayaKategori = 'gaji' | 'solar' | 'transport' | 'lainnya'
type AkunOption = { id: string; nama: string; tipe: string }

type EditItem = {
  id: string
  tanggal: string
  kategori: BiayaKategori
  jumlah: number
  akunSumberId: string
  catatan: string | null
  fotos: { url: string }[]
}

type Props = {
  children: React.ReactNode
  akunOptions: AkunOption[]
  editItem?: EditItem
}

export function BiayaFormDialog({ children, akunOptions, editItem }: Props) {
  const isEdit = !!editItem
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID())
  const [kategori, setKategori] = useState<BiayaKategori>(editItem?.kategori ?? 'gaji')
  const [akunSumberId, setAkunSumberId] = useState(editItem?.akunSumberId ?? akunOptions?.[0]?.id ?? '')
  const [jumlah, setJumlah] = useState(editItem?.jumlah ?? 0)
  const [fotos, setFotos] = useState<string[]>(editItem?.fotos.map((f) => f.url) ?? [])
  const [errors, setErrors] = useState<{ jumlah?: string }>({})

  function resetForm() {
    setKategori(editItem?.kategori ?? 'gaji')
    setAkunSumberId(editItem?.akunSumberId ?? akunOptions?.[0]?.id ?? '')
    setJumlah(editItem?.jumlah ?? 0)
    setFotos(editItem?.fotos.map((f) => f.url) ?? [])
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
      formData.set('kategori', kategori)
      formData.set('akunSumberId', akunSumberId)
      formData.set('jumlah', String(jumlah))
      formData.set('fotoUrls', JSON.stringify(fotos))

      if (isEdit) {
        await updateBiayaOperasional(editItem!.id, formData)
        toast.success('Biaya operasional berhasil diperbarui')
      } else {
        formData.set('idempotencyKey', idemKey)
        await createBiayaOperasional(formData)
        toast.success('Biaya operasional berhasil ditambahkan')
        setIdemKey(crypto.randomUUID())
      }

      setOpen(false)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan biaya')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); resetForm() }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Biaya Operasional' : 'Tambah Biaya Operasional'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tanggal">Tanggal</Label>
              <Input id="tanggal" name="tanggal" type="date" defaultValue={editItem?.tanggal ?? todayString()} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="by-kategori">Kategori</Label>
              <Select value={kategori} onValueChange={(v) => setKategori(v as BiayaKategori)}>
                <SelectTrigger id="by-kategori"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
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
              <Label htmlFor="by-akun">Akun Sumber</Label>
              <Select value={akunSumberId} onValueChange={(v) => { if (v) setAkunSumberId(v) }}>
                <SelectTrigger id="by-akun"><SelectValue placeholder="Pilih akun" /></SelectTrigger>
                <SelectContent>
                  {akunOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="by-jumlah">Jumlah (Rp)</Label>
              <NumberInput
                id="by-jumlah"
                name="jumlah"
                value={jumlah}
                onChange={(v) => { setJumlah(v); if (errors.jumlah) setErrors({}) }}
                placeholder="0"
                aria-invalid={!!errors.jumlah}
                className={cn('glow-keluar', errors.jumlah && invalidFieldClass)}
              />
              <FieldError>{errors.jumlah}</FieldError>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="by-catatan">Catatan</Label>
            <Textarea
              id="by-catatan"
              name="catatan"
              rows={3}
              placeholder="Opsional"
              defaultValue={editItem?.catatan ?? undefined}
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
              {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Biaya'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
