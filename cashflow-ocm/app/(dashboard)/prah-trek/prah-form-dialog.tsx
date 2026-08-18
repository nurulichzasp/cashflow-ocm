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
import { formatRupiah, todayString } from '@/lib/format'
import { hitungPendapatanPrah, PRAH_BIAYA_SOPIR, PRAH_TARIF_PER_KG, PRAH_TRUK_LABEL, type PrahTruk } from '@/lib/prah-trek'
import { createPrahAngkutan, updatePrahAngkutan } from './actions'

type EditItem = {
  id: string
  tanggal: string
  truk: PrahTruk
  peronMuat: string
  tonaseKotor: number
  tonaseNetto1: number
  tarifPerKg: number
  biayaSopir: number
  catatan: string | null
}

export function PrahFormDialog({
  children,
  editItem,
  open: openProp,
  onOpenChange,
}: {
  children?: React.ReactNode
  editItem?: EditItem
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = (value: boolean) => onOpenChange ? onOpenChange(value) : setInternalOpen(value)
  const [loading, setLoading] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())
  const [truk, setTruk] = useState<PrahTruk>(editItem?.truk ?? 'katimin')
  const [kotor, setKotor] = useState(editItem?.tonaseKotor ?? 0)
  const [netto, setNetto] = useState(editItem?.tonaseNetto1 ?? 0)
  const [errors, setErrors] = useState<{ kotor?: string; netto?: string }>({})

  function reset() {
    setTruk(editItem?.truk ?? 'katimin')
    setKotor(editItem?.tonaseKotor ?? 0)
    setNetto(editItem?.tonaseNetto1 ?? 0)
    setErrors({})
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    if (kotor <= 0) nextErrors.kotor = 'Tonase kotor wajib diisi.'
    if (netto <= 0) nextErrors.netto = 'Netto 1 wajib diisi.'
    else if (netto > kotor) nextErrors.netto = 'Netto 1 tidak boleh melebihi tonase kotor.'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)
    try {
      const formData = new FormData(event.currentTarget)
      formData.set('truk', truk)
      formData.set('tonaseKotor', String(kotor))
      formData.set('tonaseNetto1', String(netto))
      if (editItem) {
        await updatePrahAngkutan(editItem.id, formData)
        toast.success('Catatan prah diperbarui')
      } else {
        formData.set('idempotencyKey', idempotencyKey)
        await createPrahAngkutan(formData)
        setIdempotencyKey(crypto.randomUUID())
        toast.success('Prah berhasil dicatat')
      }
      setOpen(false)
      reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan prah')
    } finally {
      setLoading(false)
    }
  }

  const tarifPerKg = editItem?.tarifPerKg ?? PRAH_TARIF_PER_KG
  const biayaSopir = editItem?.biayaSopir ?? PRAH_BIAYA_SOPIR
  const pendapatan = hitungPendapatanPrah(kotor, tarifPerKg)

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (value) reset() }}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit Catatan Prah' : 'Catat Prah'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prah-tanggal">Tanggal</Label>
              <Input id="prah-tanggal" name="tanggal" type="date" defaultValue={editItem?.tanggal ?? todayString()} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prah-truk">Truk / sopir</Label>
              <Select value={truk} onValueChange={(value) => setTruk(value as PrahTruk)}>
                <SelectTrigger id="prah-truk"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRAH_TRUK_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prah-peron">Peron muat</Label>
            <Input id="prah-peron" name="peronMuat" defaultValue={editItem?.peronMuat ?? 'Nolin'} placeholder="Nolin" required />
            <p className="text-xs text-stone-400">Disimpan sebagai catatan aset pribadi, tidak terhubung ke transaksi peron OCM.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prah-kotor">Tonase kotor (kg)</Label>
              <NumberInput
                id="prah-kotor"
                value={kotor}
                onChange={(value) => { setKotor(value); setErrors((current) => ({ ...current, kotor: undefined })) }}
                placeholder="0"
                aria-invalid={!!errors.kotor}
                className={cn(errors.kotor && invalidFieldClass)}
              />
              <FieldError>{errors.kotor}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prah-netto">Netto 1 (kg)</Label>
              <NumberInput
                id="prah-netto"
                value={netto}
                onChange={(value) => { setNetto(value); setErrors((current) => ({ ...current, netto: undefined })) }}
                placeholder="0"
                aria-invalid={!!errors.netto}
                className={cn(errors.netto && invalidFieldClass)}
              />
              <FieldError>{errors.netto}</FieldError>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-white/[0.07] dark:bg-white/[0.035]">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>Pendapatan ({formatRupiah(tarifPerKg)}/kg × kotor)</span>
              <span className="font-semibold text-stone-900 dark:text-zinc-100">{formatRupiah(pendapatan)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs text-stone-500">
              <span>Biaya sopir / prah</span>
              <span>{formatRupiah(biayaSopir)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prah-catatan">Catatan</Label>
            <Textarea id="prah-catatan" name="catatan" rows={2} defaultValue={editItem?.catatan ?? ''} placeholder="Opsional, mis. lokasi peron" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan…' : editItem ? 'Simpan Perubahan' : 'Catat Prah'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
