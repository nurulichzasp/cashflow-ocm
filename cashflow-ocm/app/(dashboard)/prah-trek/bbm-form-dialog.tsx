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
import { PRAH_TRUK_LABEL, type PrahTruk } from '@/lib/prah-trek'
import { createPrahBbm, updatePrahBbm } from './actions'

type EditItem = {
  id: string
  tanggal: string
  truk: PrahTruk
  jumlahKen: number
  biayaTotal: number
  catatan: string | null
}

export function BbmFormDialog({
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
  const [jumlahKen, setJumlahKen] = useState(editItem?.jumlahKen ?? 2)
  const [biayaTotal, setBiayaTotal] = useState(editItem?.biayaTotal ?? 0)
  const [errors, setErrors] = useState<{ ken?: string; biaya?: string }>({})

  function reset() {
    setTruk(editItem?.truk ?? 'katimin')
    setJumlahKen(editItem?.jumlahKen ?? 2)
    setBiayaTotal(editItem?.biayaTotal ?? 0)
    setErrors({})
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    if (!Number.isInteger(jumlahKen) || jumlahKen <= 0) nextErrors.ken = 'Jumlah ken wajib lebih dari 0.'
    if (biayaTotal <= 0) nextErrors.biaya = 'Biaya total BBM wajib diisi.'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    setLoading(true)
    try {
      const formData = new FormData(event.currentTarget)
      formData.set('truk', truk)
      formData.set('jumlahKen', String(jumlahKen))
      formData.set('biayaTotal', String(biayaTotal))
      if (editItem) {
        await updatePrahBbm(editItem.id, formData)
        toast.success('Catatan BBM diperbarui')
      } else {
        formData.set('idempotencyKey', idempotencyKey)
        await createPrahBbm(formData)
        setIdempotencyKey(crypto.randomUUID())
        toast.success('Pengisian BBM berhasil dicatat')
      }
      setOpen(false)
      reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan BBM')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (value) reset() }}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editItem ? 'Edit Pengisian BBM' : 'Catat Isi BBM'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bbm-tanggal">Tanggal</Label>
              <Input id="bbm-tanggal" name="tanggal" type="date" defaultValue={editItem?.tanggal ?? todayString()} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bbm-truk">Truk / sopir</Label>
              <Select value={truk} onValueChange={(value) => setTruk(value as PrahTruk)}>
                <SelectTrigger id="bbm-truk"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRAH_TRUK_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Jumlah ken</Label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setJumlahKen(value); setErrors((current) => ({ ...current, ken: undefined })) }}
                  className={cn(
                    'h-10 rounded-lg border text-sm font-semibold transition-colors',
                    jumlahKen === value
                      ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                      : 'border-stone-200 text-stone-500 hover:bg-stone-50 dark:border-white/[0.09] dark:hover:bg-white/[0.05]',
                  )}
                >
                  {value} ken
                </button>
              ))}
            </div>
            <FieldError>{errors.ken}</FieldError>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bbm-biaya">Total biaya BBM (Rp)</Label>
            <NumberInput
              id="bbm-biaya"
              value={biayaTotal}
              onChange={(value) => { setBiayaTotal(value); setErrors((current) => ({ ...current, biaya: undefined })) }}
              placeholder="0"
              aria-invalid={!!errors.biaya}
              className={cn(errors.biaya && invalidFieldClass)}
            />
            <FieldError>{errors.biaya}</FieldError>
            {jumlahKen > 0 && biayaTotal > 0 && (
              <p className="text-xs text-stone-400">Rata-rata {formatRupiah(Math.round(biayaTotal / jumlahKen))} per ken</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bbm-catatan">Catatan</Label>
            <Textarea id="bbm-catatan" name="catatan" rows={2} defaultValue={editItem?.catatan ?? ''} placeholder="Opsional" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan…' : editItem ? 'Simpan Perubahan' : 'Catat BBM'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
