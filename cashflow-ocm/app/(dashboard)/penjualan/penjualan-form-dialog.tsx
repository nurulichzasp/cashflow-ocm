'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createPenjualan } from './actions'
import { todayString } from '@/lib/format'
import { FileText, Loader2, Sparkles, ChevronDown, ChevronUp, Table2 } from 'lucide-react'

type PreviewRow = { noInv: string; ket: string; area: string; total: number; dpp: number; ppn: number; pph: number; dibayar: number }
type TotalRow = { total: number; dpp: number; ppn: number; pph: number; dibayar: number }

type Props = { children: React.ReactNode }

export function PenjualanFormDialog({ children }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID())
  const [parsing, setParsing] = useState(false)
  const [statusBayar, setStatusBayar] = useState<'belum' | 'lunas'>('belum')
  const [tanggal, setTanggal] = useState(todayString())
  const [noInvoice, setNoInvoice] = useState('')
  const [totalBersih, setTotalBersih] = useState('')
  const [totalNilai, setTotalNilai] = useState('')
  const [catatan, setCatatan] = useState('')
  const [preview, setPreview] = useState<{ sheetNames: string[]; rows: PreviewRow[]; totalRow: TotalRow } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(true)
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
      if (data.noInvoice) setNoInvoice(data.noInvoice)
      if (data.totalBersih) setTotalBersih(data.totalBersih)
      if (data.totalNilai) setTotalNilai(data.totalNilai)
      if (data.previewRows && data.sheetNames) {
        setPreview({ sheetNames: data.sheetNames, rows: data.previewRows, totalRow: data.totalRow })
        setPreviewOpen(true)
      }
      if (data.catatan) {
        setCatatan(data.catatan)
      } else if (data.totalNilai || data.totalTonase) {
        const notes = [
          data.totalTonase ? `Tonase: ${data.totalTonase} kg` : '',
          data.totalNilai ? `Total: Rp ${Number(data.totalNilai).toLocaleString('id-ID')}` : '',
        ].filter(Boolean).join(' | ')
        if (notes) setCatatan(notes)
      }

      const filled = [data.tanggal, data.noInvoice, data.catatan].filter(Boolean).length
      if (filled > 0) {
        const src = data.info === 'excel-bga-rekap' ? (data.rekapSheet || 'Rekap') : data.info?.includes('excel') ? 'Excel' : 'PDF'
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
      formData.set('noInvoice', noInvoice)
      formData.set('totalBersih', totalBersih)
      formData.set('totalNilai', totalNilai)
      formData.set('catatan', catatan)
      formData.set('idempotencyKey', idemKey)
      await createPenjualan(formData)
      toast.success('Penjualan berhasil ditambahkan')
      setIdemKey(crypto.randomUUID())
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
    setNoInvoice('')
    setTotalBersih('')
    setTotalNilai('')
    setCatatan('')
    setPreview(null)
    setStatusBayar('belum')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tambah Penjualan</DialogTitle>
        </DialogHeader>

        {/* Upload PDF */}
        <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-stone-400 dark:text-zinc-500" />
            <p className="text-sm font-medium text-foreground">Upload BAST / Invoice</p>
          </div>
          <p className="text-xs text-muted-foreground">Upload PDF / Excel / Foto — form terisi otomatis</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
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

        {/* Preview Excel */}
        {preview && (
          <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setPreviewOpen(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50"
            >
              <span className="flex items-center gap-2">
                <Table2 className="h-3.5 w-3.5" />
                Preview Rekap
                <span className="text-xs text-muted-foreground font-normal">({preview.rows.length} baris)</span>
              </span>
              {previewOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {previewOpen && (
              <div className="border-t border-border">
                {/* Sheet names */}
                <div className="px-3 py-2 flex flex-wrap gap-1.5 border-b border-border">
                  <span className="text-[10px] text-muted-foreground self-center">Sheet:</span>
                  {preview.sheetNames.map(s => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-muted-foreground font-medium">{s}</span>
                  ))}
                </div>
                {/* REKAP table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-white/[0.04]">
                        <th className="text-left px-2 py-1.5 font-semibold text-muted-foreground">No Invoice</th>
                        <th className="text-left px-2 py-1.5 font-semibold text-muted-foreground">Ket</th>
                        <th className="text-left px-2 py-1.5 font-semibold text-muted-foreground">Area</th>
                        <th className="text-right px-2 py-1.5 font-semibold text-muted-foreground">Total</th>
                        <th className="text-right px-2 py-1.5 font-semibold text-muted-foreground">DPP</th>
                        <th className="text-right px-2 py-1.5 font-semibold text-muted-foreground">PPN</th>
                        <th className="text-right px-2 py-1.5 font-semibold text-muted-foreground">PPH</th>
                        <th className="text-right px-2 py-1.5 font-semibold text-muted-foreground">Dibayar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {preview.rows.map((r, i) => (
                        <tr key={i} className={r.dibayar > 0 ? '' : 'opacity-50'}>
                          <td className="px-2 py-1 text-foreground font-mono text-[10px] max-w-[140px] truncate">{r.noInv}</td>
                          <td className="px-2 py-1 text-muted-foreground">{r.ket}</td>
                          <td className="px-2 py-1 text-muted-foreground">{r.area}</td>
                          <td className="px-2 py-1 text-right num text-muted-foreground">{r.total > 0 ? r.total.toLocaleString('id-ID') : '—'}</td>
                          <td className="px-2 py-1 text-right num text-muted-foreground">{r.dpp > 0 ? Math.round(r.dpp).toLocaleString('id-ID') : '—'}</td>
                          <td className="px-2 py-1 text-right num text-muted-foreground">{r.ppn > 0 ? Math.round(r.ppn).toLocaleString('id-ID') : '—'}</td>
                          <td className="px-2 py-1 text-right num text-muted-foreground">{r.pph > 0 ? Math.round(r.pph).toLocaleString('id-ID') : '—'}</td>
                          <td className="px-2 py-1 text-right num font-semibold text-foreground">{r.dibayar > 0 ? Math.round(r.dibayar).toLocaleString('id-ID') : '—'}</td>
                        </tr>
                      ))}
                      {/* Total row */}
                      <tr className="bg-white/[0.05] font-bold">
                        <td className="px-2 py-1.5 text-foreground" colSpan={3}>TOTAL</td>
                        <td className="px-2 py-1.5 text-right num text-foreground">{Math.round(preview.totalRow.total).toLocaleString('id-ID')}</td>
                        <td className="px-2 py-1.5 text-right num text-foreground">{Math.round(preview.totalRow.dpp).toLocaleString('id-ID')}</td>
                        <td className="px-2 py-1.5 text-right num text-foreground">{Math.round(preview.totalRow.ppn).toLocaleString('id-ID')}</td>
                        <td className="px-2 py-1.5 text-right num text-foreground">{Math.round(preview.totalRow.pph).toLocaleString('id-ID')}</td>
                        <td className="px-2 py-1.5 text-right num text-foreground">{Math.round(preview.totalRow.dibayar).toLocaleString('id-ID')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tanggal</Label>
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
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
              <Label>Tanggal Bayar</Label>
              <Input name="tanggalBayarBga" type="date" disabled={statusBayar === 'belum'} />
            </div>
          </div>

          {/* Nilai penjualan */}
          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nilai Penjualan</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Nilai Bersih <span className="text-muted-foreground font-normal text-xs">(tanpa pajak)</span></Label>
                <Input
                  type="number"
                  value={totalBersih}
                  onChange={(e) => setTotalBersih(e.target.value)}
                  placeholder="0"
                  className="glow-masuk"
                />
                {totalBersih && Number(totalBersih) > 0 && (
                  <p className="text-xs font-semibold text-foreground">Rp {Number(totalBersih).toLocaleString('id-ID')}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Total Dibayar <span className="text-muted-foreground font-normal text-xs">(+PPN−PPH)</span></Label>
                <Input
                  type="number"
                  value={totalNilai}
                  onChange={(e) => setTotalNilai(e.target.value)}
                  placeholder="0"
                  className="glow-masuk"
                />
                {totalNilai && Number(totalNilai) > 0 && (
                  <p className="text-xs text-muted-foreground">Rp {Number(totalNilai).toLocaleString('id-ID')}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Opsional: catatan singkat untuk invoice"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 -mx-6 px-6 -mb-6 pb-6 border-t border-border bg-muted/30 rounded-b-3xl">
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
