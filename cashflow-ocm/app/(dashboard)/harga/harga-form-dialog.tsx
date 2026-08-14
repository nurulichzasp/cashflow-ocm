'use client'

import { useEffect, useState } from 'react'
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
import { NumberInput } from '@/components/number-input'
import { createHargaAcuanBatch, getHargaAktifSemua } from './actions'
import { todayString } from '@/lib/format'

interface Props {
  children: React.ReactNode
}

export function HargaFormDialog({ children }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [prefilling, setPrefilling] = useState(false)

  const [tanggalBerlaku, setTanggalBerlaku] = useState(todayString())
  const [tbs, setTbs] = useState(0)
  const [brdlKtwm, setBrdlKtwm] = useState(0)
  const [brdlTrym, setBrdlTrym] = useState(0)

  // Pre-fill dengan harga aktif terakhir tiap produk saat dialog dibuka — user
  // cukup ubah yang berubah. LMDM tidak diinput (otomatis = TRYM).
  useEffect(() => {
    if (!open) return
    let cancelled = false
    getHargaAktifSemua(tanggalBerlaku)
      .then((h) => {
        if (cancelled) return
        setTbs(h.tbs ?? 0)
        setBrdlKtwm(h.brdlKtwm ?? 0)
        setBrdlTrym(h.brdlTrym ?? 0)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Gagal memuat harga aktif:', error)
        toast.error('Harga terakhir gagal dimuat. Coba tutup dan buka kembali.')
      })
      .finally(() => { if (!cancelled) setPrefilling(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const valid = tbs > 0 && brdlKtwm > 0 && brdlTrym > 0 && tanggalBerlaku !== ''

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setTbs(0)
      setBrdlKtwm(0)
      setBrdlTrym(0)
      setPrefilling(true)
    }
    setOpen(nextOpen)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!valid) {
      toast.error('Lengkapi tanggal & semua harga (harus lebih dari 0)')
      return
    }
    setLoading(true)
    try {
      await createHargaAcuanBatch({ tanggalBerlaku, tbs, brdlKtwm, brdlTrym })
      toast.success('Harga acuan semua produk berhasil disimpan')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Harga Acuan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="hg-tanggal">Tanggal Berlaku *</Label>
            <Input
              id="hg-tanggal"
              type="date"
              value={tanggalBerlaku}
              onChange={(e) => setTanggalBerlaku(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Satu tanggal untuk semua produk sekaligus.</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>TBS (Rp/kg) *</Label>
              <NumberInput value={tbs} onChange={setTbs} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>BRDL KTWM (Rp/kg) *</Label>
              <NumberInput value={brdlKtwm} onChange={setBrdlKtwm} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>BRDL TRYM (Rp/kg) *</Label>
              <NumberInput value={brdlTrym} onChange={setBrdlTrym} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">BRDL LMDM (Rp/kg)</Label>
              <div className="flex h-9 items-center justify-between rounded-md border border-input bg-muted/40 px-3 text-sm">
                <span className="num font-medium text-foreground">
                  Rp {brdlTrym.toLocaleString('id-ID')}
                </span>
                <span className="text-xs text-muted-foreground">= TRYM (otomatis)</span>
              </div>
            </div>
          </div>

          {prefilling && (
            <p className="text-xs text-muted-foreground">Memuat harga terakhir…</p>
          )}

          <div
            className="flex justify-end gap-2 pt-2"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading || prefilling || !valid}>
              {loading ? 'Menyimpan...' : 'Simpan Semua'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
