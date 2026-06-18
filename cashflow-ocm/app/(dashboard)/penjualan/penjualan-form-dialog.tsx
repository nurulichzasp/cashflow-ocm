'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/components/ui/field-error'
import { createPenjualan, updatePenjualan } from './actions'
import { todayString } from '@/lib/format'
import { FileText, Loader2, Sparkles, ChevronDown, ChevronUp, Table2 } from 'lucide-react'
import type { Penjualan } from '@/lib/db/schema'

type SideVal = { total: number; dpp: number; ppn: number; pph: number; dibayar: number }
type MergedRow = { noInv: string; ket: string; area: string; rekap: SideVal | null; rekap2: SideVal | null; conflict: boolean }
type PreviewData = { sheetNames: string[]; rows: MergedRow[]; periode: string }

const rp = (n: number) => Math.round(n).toLocaleString('id-ID')

// Nilai aktif sebuah baris: yg disepakati (kalau cocok) atau yg dipilih user (kalau beda)
function activeVal(row: MergedRow, pick?: 'rekap' | 'rekap2'): SideVal | null {
  if (!row.conflict) return row.rekap2 ?? row.rekap
  if (!pick) return null
  return pick === 'rekap' ? row.rekap : row.rekap2
}

type Props = { children?: React.ReactNode; editItem?: Penjualan; open?: boolean; onOpenChange?: (open: boolean) => void }

export function PenjualanFormDialog({ children, editItem, open: openProp, onOpenChange }: Props) {
  const isEdit = !!editItem
  const [openInternal, setOpenInternal] = useState(false)
  const open = openProp ?? openInternal
  const setOpen = (v: boolean) => { if (onOpenChange) onOpenChange(v); else setOpenInternal(v) }
  const [loading, setLoading] = useState(false)
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID())
  const [parsing, setParsing] = useState(false)
  const [statusBayar, setStatusBayar] = useState<'belum' | 'lunas'>(editItem?.statusBayar ?? 'belum')
  const [tanggal, setTanggal] = useState(editItem?.tanggal ?? todayString())
  const [noInvoice, setNoInvoice] = useState(editItem?.noInvoice ?? '')
  const [totalBersih, setTotalBersih] = useState(editItem?.totalBersih ? String(editItem.totalBersih) : '')
  const [totalNilai, setTotalNilai] = useState(editItem?.totalNilai ? String(editItem.totalNilai) : '')
  const [catatan, setCatatan] = useState(editItem?.catatan ?? '')
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [picks, setPicks] = useState<Record<number, 'rekap' | 'rekap2'>>({})
  const [previewOpen, setPreviewOpen] = useState(true)
  const [errTanggal, setErrTanggal] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const unresolved = preview ? preview.rows.filter((r, i) => r.conflict && !picks[i]).length : 0

  // Hitung ulang total + catatan tiap kali rekap/pilihan berubah (hanya saat ada preview upload)
  useEffect(() => {
    if (!preview) return
    let tB = 0, tN = 0, tDpp = 0, tPpn = 0, tPph = 0
    const detail: string[] = []
    preview.rows.forEach((r, i) => {
      const v = activeVal(r, picks[i])
      if (!v) return
      tB += v.total; tN += v.dibayar; tDpp += v.dpp; tPpn += v.ppn; tPph += v.pph
      if (v.dibayar > 0) detail.push(`${r.ket} (${r.area}): Rp ${rp(v.dibayar)}`)
    })
    setTotalBersih(tB ? String(Math.round(tB)) : '')
    setTotalNilai(tN ? String(Math.round(tN)) : '')
    const lines: string[] = []
    if (preview.periode) lines.push(preview.periode)
    lines.push(...detail)
    if (tN > 0 || tB > 0) {
      lines.push(`Total: ${rp(tB)} | DPP: ${rp(tDpp)} | PPN: ${rp(tPpn)} | PPH: ${rp(tPph)}`)
      lines.push(`Total Dibayar: Rp ${rp(tN)}`)
    }
    setCatatan(lines.join('\n'))
  }, [preview, picks])

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/parse-bast', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal membaca file')

      if (data.info === 'excel-bga-rekap' && Array.isArray(data.mergedRows)) {
        if (data.tanggal) setTanggal(data.tanggal)
        if (data.noInvoice) setNoInvoice(data.noInvoice)
        setPreview({ sheetNames: data.sheetNames ?? [], rows: data.mergedRows, periode: data.periode ?? '' })
        setPicks({})
        setPreviewOpen(true)
        const conflicts = (data.mergedRows as MergedRow[]).filter(r => r.conflict).length
        if (conflicts > 0) toast.warning(`${conflicts} kategori beda antara REKAP & REKAP 2 HARGA — pilih yang benar`)
        else toast.success('Data terisi dari rekap BGA')
        return
      }

      // PDF / Excel non-rekap / foto
      setPreview(null)
      setPicks({})
      if (data.tanggal) setTanggal(data.tanggal)
      if (data.noInvoice) setNoInvoice(data.noInvoice)
      if (data.totalBersih) setTotalBersih(data.totalBersih)
      if (data.totalNilai) setTotalNilai(data.totalNilai)
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
        const src = data.info?.includes('excel') ? 'Excel' : 'PDF'
        toast.success(`Data berhasil diisi dari ${src}`)
      } else {
        toast.info('File terbaca tapi tidak ada field yang cocok — isi manual ya')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membaca file')
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (unresolved > 0) {
      toast.error(`Masih ada ${unresolved} kategori yang belum dipilih`)
      return
    }
    if (!tanggal) {
      setErrTanggal('Tanggal wajib diisi')
      return
    }
    setErrTanggal('')
    setLoading(true)
    try {
      const formData = new FormData(e.currentTarget)
      formData.set('statusBayar', statusBayar)
      formData.set('tanggal', tanggal)
      formData.set('noInvoice', noInvoice)
      formData.set('totalBersih', totalBersih)
      formData.set('totalNilai', totalNilai)
      formData.set('catatan', catatan)
      if (isEdit) {
        await updatePenjualan(editItem!.id, formData)
        toast.success('Penjualan berhasil diperbarui')
      } else {
        formData.set('idempotencyKey', idemKey)
        await createPenjualan(formData)
        toast.success('Penjualan berhasil ditambahkan')
        setIdemKey(crypto.randomUUID())
      }
      setOpen(false)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan penjualan')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setTanggal(editItem?.tanggal ?? todayString())
    setNoInvoice(editItem?.noInvoice ?? '')
    setTotalBersih(editItem?.totalBersih ? String(editItem.totalBersih) : '')
    setTotalNilai(editItem?.totalNilai ? String(editItem.totalNilai) : '')
    setCatatan(editItem?.catatan ?? '')
    setPreview(null)
    setPicks({})
    setStatusBayar(editItem?.statusBayar ?? 'belum')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); resetForm() }}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Penjualan' : 'Tambah Penjualan'}</DialogTitle>
        </DialogHeader>

        {/* Upload */}
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
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />Membaca...</>
              ) : (
                <><FileText className="h-3.5 w-3.5" />Pilih File</>
              )}
            </Button>
            <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,image/*" className="hidden" onChange={handlePdfUpload} />
          </div>
        </div>

        {/* Preview Rekap */}
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
                {unresolved > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/10 text-foreground font-medium">
                    {unresolved} perlu dipilih
                  </span>
                )}
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
                {/* Banner konflik — netral */}
                {unresolved > 0 && (
                  <div className="px-3 py-2 text-[11px] text-muted-foreground bg-muted/40 border-b border-border">
                    BGA mengirim angka berbeda untuk {unresolved} kategori. Pilih yang benar di bawah — total ikut menyesuaikan.
                  </div>
                )}
                {/* Baris */}
                <div className="divide-y divide-border">
                  {preview.rows.map((r, i) => {
                    if (!r.conflict) {
                      const v = activeVal(r, picks[i])
                      const has = !!(v && (v.total > 0 || v.dibayar > 0))
                      return (
                        <div key={i} className={`flex items-center justify-between gap-3 px-3 py-2 text-[11px] ${has ? '' : 'opacity-50'}`}>
                          <span className="text-muted-foreground">{[r.area, r.ket].filter(Boolean).join(' · ')}</span>
                          <span className="num text-right whitespace-nowrap">
                            <span className="text-muted-foreground">Total {v && v.total > 0 ? rp(v.total) : '—'}</span>
                            <span className="text-foreground font-semibold ml-3">Dibayar {v && v.dibayar > 0 ? rp(v.dibayar) : '—'}</span>
                          </span>
                        </div>
                      )
                    }
                    // Baris konflik — pilih REKAP vs REKAP 2 HARGA (netral monokrom)
                    return (
                      <div key={i} className="px-3 py-2.5 bg-foreground/[0.02]">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-[11px] font-medium text-foreground">{[r.area, r.ket].filter(Boolean).join(' · ')}</span>
                          <span className="text-[10px] text-muted-foreground">— pilih angka yang benar</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['rekap', 'rekap2'] as const).map(side => {
                            const sv = side === 'rekap' ? r.rekap : r.rekap2
                            if (!sv) return null
                            const sel = picks[i] === side
                            return (
                              <button
                                type="button"
                                key={side}
                                onClick={() => setPicks(p => ({ ...p, [i]: side }))}
                                className={`text-left rounded-md border px-2 py-1.5 transition-colors ${sel ? 'border-foreground bg-foreground/[0.06]' : 'border-border hover:bg-muted/50'}`}
                              >
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${sel ? 'bg-foreground' : 'border border-muted-foreground'}`} />
                                  {side === 'rekap' ? 'REKAP (1 harga)' : 'REKAP 2 HARGA'}
                                </div>
                                <div className={`text-[11px] num mt-1 ${sel ? 'text-foreground' : 'text-muted-foreground'}`}>Total {rp(sv.total)}</div>
                                <div className={`text-[11px] num font-semibold ${sel ? 'text-foreground' : 'text-muted-foreground'}`}>Dibayar {rp(sv.dibayar)}</div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  {/* Total */}
                  <div className="flex items-center justify-between gap-3 px-3 py-2 bg-white/[0.05] font-bold text-[11px]">
                    <span className="text-foreground">TOTAL{unresolved > 0 ? ' (sebagian)' : ''}</span>
                    <span className="num text-right whitespace-nowrap">
                      <span className="text-muted-foreground">Bersih {totalBersih ? Number(totalBersih).toLocaleString('id-ID') : '—'}</span>
                      <span className="text-foreground ml-3">Dibayar {totalNilai ? Number(totalNilai).toLocaleString('id-ID') : '—'}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pj-tanggal">Tanggal</Label>
            <Input
              id="pj-tanggal"
              type="date"
              value={tanggal}
              onChange={(e) => { setTanggal(e.target.value); if (errTanggal) setErrTanggal('') }}
              required
              aria-invalid={!!errTanggal}
              aria-describedby={errTanggal ? 'pj-tanggal-error' : undefined}
            />
            <FieldError id="pj-tanggal-error">{errTanggal}</FieldError>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pj-noinvoice">No. Invoice</Label>
            <Textarea
              id="pj-noinvoice"
              rows={3}
              value={noInvoice}
              onChange={(e) => setNoInvoice(e.target.value)}
              placeholder="Opsional — bisa lebih dari satu, satu baris per invoice"
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pj-status">Status Bayar</Label>
              <Select value={statusBayar} onValueChange={(v) => setStatusBayar(v as 'belum' | 'lunas')}>
                <SelectTrigger id="pj-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="belum">Belum</SelectItem>
                  <SelectItem value="lunas">Lunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pj-tglbayar">Tanggal Bayar</Label>
              <Input id="pj-tglbayar" name="tanggalBayarBga" type="date" defaultValue={editItem?.tanggalBayarBga ?? undefined} disabled={statusBayar === 'belum'} />
            </div>
          </div>

          {/* Nilai penjualan */}
          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nilai Penjualan</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pj-bersih" className="text-sm">Nilai Bersih <span className="text-muted-foreground font-normal text-xs">(tanpa pajak)</span></Label>
                <Input
                  id="pj-bersih"
                  type="number"
                  inputMode="numeric"
                  value={totalBersih}
                  onChange={(e) => setTotalBersih(e.target.value)}
                  placeholder="0"
                />
                {totalBersih && Number(totalBersih) > 0 && (
                  <p className="text-xs font-semibold text-foreground">Rp {Number(totalBersih).toLocaleString('id-ID')}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pj-dibayar" className="text-sm">Total Dibayar <span className="text-muted-foreground font-normal text-xs">(+PPN−PPH)</span></Label>
                <Input
                  id="pj-dibayar"
                  type="number"
                  inputMode="numeric"
                  value={totalNilai}
                  onChange={(e) => setTotalNilai(e.target.value)}
                  placeholder="0"
                />
                {totalNilai && Number(totalNilai) > 0 && (
                  <p className="text-xs text-muted-foreground">Rp {Number(totalNilai).toLocaleString('id-ID')}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pj-catatan">Catatan</Label>
            <Textarea
              id="pj-catatan"
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Opsional: catatan singkat untuk invoice"
            />
          </div>

          <div className="flex justify-end items-center gap-2 pt-4 -mx-6 px-6 -mb-6 pb-6 border-t border-border bg-muted/30 rounded-b-3xl">
            {unresolved > 0 && (
              <span id="pj-unresolved-hint" role="status" aria-live="polite" className="text-xs text-muted-foreground mr-auto">Pilih dulu {unresolved} kategori yang ditandai</span>
            )}
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading || unresolved > 0} aria-describedby={unresolved > 0 ? 'pj-unresolved-hint' : undefined}>
              {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Penjualan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
