'use client'

import { useRef, useState } from 'react'
import { FileText, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PrahBastRowsEditor } from '@/components/prah-bast-rows-editor'
import type { PrahBastRow } from '@/lib/bast-prah'
import { todayString } from '@/lib/format'
import { createPrahFromBast } from './actions'

export function BastFormDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [tanggal, setTanggal] = useState(todayString())
  const [noBast, setNoBast] = useState('')
  const [peronMuat, setPeronMuat] = useState('Nolin')
  const [rows, setRows] = useState<PrahBastRow[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setTanggal(todayString())
    setNoBast('')
    setPeronMuat('Nolin')
    setRows([])
  }

  async function parseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setParsing(true)
    setTanggal(todayString())
    setNoBast('')
    setRows([])
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/parse-bast', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Gagal membaca BAST')
      const parsedDate = data.tanggal || todayString()
      setTanggal(parsedDate)
      setNoBast(typeof data.noBast === 'string' ? data.noBast : '')
      const parsedRows = Array.isArray(data.prahRows)
        ? (data.prahRows as PrahBastRow[]).map((row, index) => ({
            ...row,
            key: row.key || `${Date.now()}-${index}`,
            tanggal: row.tanggal || parsedDate,
          }))
        : []
      setRows(parsedRows)
      if (parsedRows.length > 0) toast.success(`${parsedRows.length} perjalanan Doni/Katimin terbaca`)
      else toast.info('Baris sopir belum terbaca. Tambahkan Katimin/Doni lalu isi berat dari BAST secara manual.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membaca BAST')
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!noBast.trim()) {
      toast.error('No. BAST wajib diisi')
      return
    }
    const invalid = rows.find((row) => !row.tanggal || row.tonaseKotor <= 0 || row.tonaseNetto1 <= 0 || row.tonaseNetto1 > row.tonaseKotor)
    if (rows.length === 0 || invalid) {
      toast.error(rows.length === 0 ? 'Tambahkan minimal satu perjalanan' : 'Periksa tanggal, tonase kotor, dan Netto 1')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData(event.currentTarget)
      formData.set('noBast', noBast)
      formData.set('peronMuat', peronMuat)
      formData.set('prahBastRows', JSON.stringify(rows))
      const result = await createPrahFromBast(formData)
      if (result.inserted > 0) toast.success(`${result.inserted} perjalanan masuk ke Prah Trek${result.skipped ? ` · ${result.skipped} duplikat dilewati` : ''}`)
      else toast.info('Semua perjalanan dari BAST ini sudah pernah tercatat')
      setOpen(false)
      reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan BAST')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (value) reset() }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Input BAST ke Prah Trek</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-medium">Upload BAST</p></div>
            <p className="mt-1 text-xs text-muted-foreground">PDF atau Excel akan dicoba dibaca. Semua hasil tetap bisa dikoreksi.</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" disabled={parsing} onClick={() => fileRef.current?.click()}>
              {parsing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Membaca…</> : <><Upload className="h-3.5 w-3.5" /> Pilih File</>}
            </Button>
            <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls" className="hidden" onChange={parseFile} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="prah-bast-no">No. BAST</Label>
              <Input id="prah-bast-no" value={noBast} onChange={(event) => setNoBast(event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prah-bast-date">Tanggal default</Label>
              <Input id="prah-bast-date" type="date" value={tanggal} onChange={(event) => setTanggal(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prah-bast-peron">Peron muat</Label>
              <Input id="prah-bast-peron" value={peronMuat} onChange={(event) => setPeronMuat(event.target.value)} required />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Perjalanan Doni/Katimin</p>
            <p className="mb-3 text-xs text-muted-foreground">Pastikan kolom <strong>tonase kotor</strong> benar. Angka inilah yang dikali Rp140.</p>
            <PrahBastRowsEditor rows={rows} onChange={setRows} defaultDate={tanggal} />
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan…' : 'Masukkan BAST'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
