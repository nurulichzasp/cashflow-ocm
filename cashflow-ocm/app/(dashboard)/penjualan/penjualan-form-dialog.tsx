'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createPenjualan } from './actions'
import { todayString } from '@/lib/format'
import { FileText, Loader2, Sparkles } from 'lucide-react'

type Props = { children: React.ReactNode }

export function PenjualanFormDialog({ children }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [statusBayar, setStatusBayar] = useState<'belum' | 'lunas'>('belum')
  const [tanggal, setTanggal] = useState(todayString())
  const [noBast, setNoBast] = useState('')
  const [noInvoice, setNoInvoice] = useState('')
  const [catatan, setCatatan] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/parse-bast', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal membaca PDF')

      if (data.tanggal) setTanggal(data.tanggal)
      if (data.noBast) setNoBast(data.noBast)
      if (data.noInvoice) setNoInvoice(data.noInvoice)
      if (data.catatan) {
        setCatatan(data.catatan)
      } else if (data.totalNilai || data.totalTonase) {
        const notes = [
          data.totalTonase ? `Tonase: ${data.totalTonase} kg` : '',
          data.totalNilai ? `Total: Rp ${Number(data.totalNilai).toLocaleString('id-ID')}` : '',
        ].filter(Boolean).join(' | ')
        if (notes) setCatatan(notes)
      }

      const filled = [data.tanggal, data.noBast, data.noInvoice, data.catatan].filter(Boolean).length
      if (filled > 0) {
        const src = data.info === 'excel-bga-rekap' ? 'Rekap BGA' : data.info?.includes('excel') ? 'Excel' : 'PDF'
        toast.success(`Data berhasil diisi dari ${src}`)
      } else {
        toast.info('File terbaca tapi tidak ada field yang cocok — isi manual ya')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membaca PDF')
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData(e.currentTarget)
      formData.set('statusBayar', statusBayar)
      formData.set('tanggal', tanggal)
      formData.set('noBast', noBast)
      formData.set('noInvoice', noInvoice)
      formData.set('catatan', catatan)
      await createPenjualan(formData)
      toast.success('Penjualan berhasil ditambahkan')
      setOpen(false)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan penjualan')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setTanggal(todayString())
    setNoBast('')
    setNoInvoice('')
    setCatatan('')
    setStatusBayar('belum')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Penjualan</DialogTitle>
        </DialogHeader>

        {/* Upload PDF */}
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-500" />
            <p className="text-sm font-medium text-stone-700">Upload BAST / Invoice BGA</p>
          </div>
          <p className="text-xs text-stone-400">Upload PDF / Excel / Foto dari BGA — form terisi otomatis</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 text-stone-700"
              disabled={parsing}
              onClick={() => fileRef.current?.click()}
            >
              {parsing ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />Membaca PDF...</>
              ) : (
                <><FileText className="h-3.5 w-3.5" />Pilih File PDF</>
              )}
            </Button>
            <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,image/*" className="hidden" onChange={handlePdfUpload} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tanggal</Label>
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label>No. BAST</Label>
            <Input value={noBast} onChange={(e) => setNoBast(e.target.value)} placeholder="Opsional" />
          </div>

          <div className="space-y-1.5">
            <Label>No. Invoice</Label>
            <textarea
              rows={3}
              value={noInvoice}
              onChange={(e) => setNoInvoice(e.target.value)}
              placeholder="Opsional — bisa lebih dari satu, satu baris per invoice"
              className="min-h-[4rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status Bayar</Label>
              <Select value={statusBayar} onValueChange={(v) => setStatusBayar(v as 'belum' | 'lunas')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="belum">Belum</SelectItem>
                  <SelectItem value="lunas">Lunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Bayar BGA</Label>
              <Input name="tanggalBayarBga" type="date" disabled={statusBayar === 'belum'} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <textarea
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="min-h-[5rem] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Opsional: catatan singkat untuk invoice"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Tambah Penjualan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
