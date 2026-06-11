'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/number-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FotoBuktiUploader } from '@/components/foto-bukti-uploader'
import { Textarea } from '@/components/ui/textarea'
import { DateRangePopover } from '@/components/date-range-popover'
import { createPembelian, updatePembelian, getHargaAcuanListForProduk, type KategoriPembelian, type DetailInput } from './actions'
import { formatRupiah, formatRentangReplas, todayString } from '@/lib/format'
import { Plus, Trash2, CalendarDays } from 'lucide-react'

type PeronOption = { id: string; nama: string; keuntunganPerKg: number }
type AkunOption = { id: string; nama: string; tipe: string }
type AcuanRow = { tanggalBerlaku: string; hargaLapangan: number; selisihJualBga: number }

interface DetailRow {
  noTid: string
  jumlahReplas: string
  tonase: string
  hargaLapangan: string
  tanggalReplas: string // "dari"
  tanggalReplasSampai: string // "sampai" ('' = tunggal)
  manualPrice: boolean // harga di-override manual → jangan ditimpa auto
}

interface Props {
  children: React.ReactNode
  peronOptions: PeronOption[]
  akunOptions: AkunOption[]
  open?: boolean
  initialData?: {
    id: string
    tanggal: string
    kategori: KategoriPembelian
    peronId: string
    statusBayarPeron: 'belum' | 'lunas'
    sumberBayarId?: string
    catatan?: string
    keterangan?: string
    fotoUrls?: string[]
    details: Array<{ noTid?: string; tonase: number; hargaLapangan: number; tanggalReplas?: string; tanggalReplasSampai?: string; jumlahReplas?: number }>
  }
  onOpenChange?: (open: boolean) => void
}

const EMPTY_DETAIL: DetailRow = { noTid: '', jumlahReplas: '', tonase: '', hargaLapangan: '', tanggalReplas: '', tanggalReplasSampai: '', manualPrice: false }

export function PembelianFormDialog({ children, peronOptions, akunOptions, open: openProp, initialData, onOpenChange }: Props) {
  const [openInternal, setOpenInternal] = useState(false)
  const open = openProp ?? openInternal
  const setOpen = (v: boolean) => { onOpenChange ? onOpenChange(v) : setOpenInternal(v) }
  const [loading, setLoading] = useState(false)
  // Idempotency key per pembukaan form — kunci anti-dobel race-proof di server.
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID())

  const [tanggal, setTanggal] = useState(todayString())
  const [kategori, setKategori] = useState<KategoriPembelian>('OCM R2')
  const [peronId, setPeronId] = useState(peronOptions?.[0]?.id ?? '')
  const [statusBayar, setStatusBayar] = useState<'belum' | 'lunas'>('belum')
  const [sumberBayarId, setSumberBayarId] = useState('')
  const [catatan, setCatatan] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [keteranganManual, setKeteranganManual] = useState(false)
  const [fotos, setFotos] = useState<string[]>([])
  const [details, setDetails] = useState<DetailRow[]>([{ ...EMPTY_DETAIL }])

  useEffect(() => {
    if (initialData && open) {
      setTanggal(initialData.tanggal)
      setKategori(initialData.kategori)
      setPeronId(initialData.peronId)
      setStatusBayar(initialData.statusBayarPeron)
      setSumberBayarId(initialData.sumberBayarId ?? '')
      setCatatan(initialData.catatan ?? '')
      setKeterangan(initialData.keterangan ?? '')
      // Tiket lama: pertahankan keterangan tersimpan (anggap manual) agar tak ditimpa auto.
      setKeteranganManual(!!initialData.keterangan)
      setFotos(initialData.fotoUrls ?? [])
      setDetails(
        initialData.details.length > 0
          ? initialData.details.map((d) => ({
              noTid: d.noTid ?? '',
              jumlahReplas: d.jumlahReplas != null ? String(d.jumlahReplas) : '',
              tonase: String(d.tonase),
              hargaLapangan: String(d.hargaLapangan),
              tanggalReplas: d.tanggalReplas ?? '',
              tanggalReplasSampai: d.tanggalReplasSampai ?? '',
              // Harga tersimpan dipertahankan saat edit (jangan ditimpa auto bila acuan berubah).
              manualPrice: true,
            }))
          : [{ ...EMPTY_DETAIL }]
      )
    }
  }, [initialData, open])

  const selectedPeron = peronOptions.find((p) => p.id === peronId)
  const keuntunganPerKg = selectedPeron?.keuntunganPerKg ?? 0

  const [acuanList, setAcuanList] = useState<AcuanRow[]>([])
  const [hargaLoading, setHargaLoading] = useState(false)

  // Kategori BRDL merujuk ke Harga Acuan produknya. LMDM mengikuti harga TRYM.
  const derivedProduk: 'TBS' | 'BRDL KTWM' | 'BRDL TRYM' =
    kategori === 'OCM BRDL KTWM' || kategori === 'OCM BRDL'
      ? 'BRDL KTWM'
      : kategori === 'OCM BRDL TRYM' || kategori === 'OCM BRDL LMDM'
        ? 'BRDL TRYM'
        : 'TBS'

  // Step-function harga acuan: baris paling baru dengan tanggalBerlaku <= tanggal.
  function lookupAcuan(date: string): AcuanRow | null {
    let best: AcuanRow | null = null
    for (const a of acuanList) {
      if (a.tanggalBerlaku <= date && (!best || a.tanggalBerlaku > best.tanggalBerlaku)) best = a
    }
    return best
  }
  // Harga beli auto = acuan + (selisihJualBga − untungCV). null bila tak ada acuan.
  function autoHargaForDate(date: string): number | null {
    const a = lookupAcuan(date)
    if (!a) return null
    return a.hargaLapangan + (a.selisihJualBga - keuntunganPerKg)
  }
  // Rentang baris melewati >1 harga acuan? (ada tanggalBerlaku di dalam (dari, sampai])
  function warnRange(d: DetailRow): boolean {
    if (!d.tanggalReplas || !d.tanggalReplasSampai) return false
    return acuanList.some((a) => a.tanggalBerlaku > d.tanggalReplas && a.tanggalBerlaku <= d.tanggalReplasSampai)
  }

  // Referensi harga untuk tanggal header (panel ringkasan — acuan & kelebihan saja)
  const headerAcuan = lookupAcuan(tanggal)

  // Muat seluruh riwayat harga acuan produk saat dialog dibuka / produk berganti.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setHargaLoading(true)
    getHargaAcuanListForProduk(derivedProduk).then((rows) => {
      if (cancelled) return
      setAcuanList(rows)
      setHargaLoading(false)
    })
    return () => { cancelled = true }
  }, [open, derivedProduk])

  // Recompute harga semua baris NON-manual saat acuan/untung/tanggal header berubah.
  // (Tanggal "dari" baris kosong → fallback tanggal header.)
  useEffect(() => {
    if (!open || acuanList.length === 0) return
    setDetails((prev) => prev.map((d) => {
      if (d.manualPrice) return d
      const auto = autoHargaForDate(d.tanggalReplas || tanggal)
      return auto !== null ? { ...d, hargaLapangan: String(auto) } : d
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acuanList, keuntunganPerKg, tanggal, open])

  function updateDetail(idx: number, field: keyof DetailRow, value: string) {
    setDetails((prev) => prev.map((d, i) => {
      if (i !== idx) return d
      // Edit harga manual → tandai baris agar tak ditimpa auto.
      if (field === 'hargaLapangan') return { ...d, hargaLapangan: value, manualPrice: true }
      return { ...d, [field]: value }
    }))
  }

  // Set rentang tanggal replas baris + recompute harga baris itu (kecuali manual).
  function setRowRange(idx: number, from: string, sampai: string) {
    setDetails((prev) => prev.map((d, i) => {
      if (i !== idx) return d
      const nd = { ...d, tanggalReplas: from, tanggalReplasSampai: sampai }
      if (!nd.manualPrice) {
        const auto = autoHargaForDate(from || tanggal)
        if (auto !== null) nd.hargaLapangan = String(auto)
      }
      return nd
    }))
  }

  function addDetail() {
    // Baris baru langsung dapat harga auto tanggal header (akan ter-recompute saat tanggalnya diisi).
    const auto = autoHargaForDate(tanggal)
    setDetails((prev) => [...prev, { ...EMPTY_DETAIL, hargaLapangan: auto !== null ? String(auto) : '' }])
  }

  function removeDetail(idx: number) {
    setDetails((prev) => prev.filter((_, i) => i !== idx))
  }

  // Keterangan otomatis: "Total {N} Replas ({rentang})" dari baris bertonase > 0.
  const autoKeterangan = (() => {
    const rows = details.filter((d) => (parseFloat(d.tonase) || 0) > 0)
    if (rows.length === 0) return ''
    const totalReplas = rows.reduce((s, d) => s + (parseInt(d.jumlahReplas, 10) || 0), 0)
    const froms = rows.map((d) => d.tanggalReplas || tanggal).filter(Boolean)
    const tos = rows.map((d) => d.tanggalReplasSampai || d.tanggalReplas || tanggal).filter(Boolean)
    if (froms.length === 0) return ''
    const min = froms.reduce((a, b) => (a < b ? a : b))
    const max = tos.reduce((a, b) => (a > b ? a : b))
    return `Total ${totalReplas} Replas (${formatRentangReplas(min, max)})`
  })()

  useEffect(() => {
    if (!keteranganManual) setKeterangan(autoKeterangan)
  }, [autoKeterangan, keteranganManual])

  const parsedDetails = details.map((d) => ({
    tonase: parseFloat(d.tonase) || 0,
    hargaLapangan: parseFloat(d.hargaLapangan) || 0,
  }))
  const totalTonase = parsedDetails.reduce((s, d) => s + d.tonase, 0)
  const totalBeli = parsedDetails.reduce((s, d) => s + d.tonase * d.hargaLapangan, 0)
  const totalJual = parsedDetails.reduce((s, d) => s + d.tonase * (d.hargaLapangan + keuntunganPerKg), 0)
  const totalKeuntungan = totalJual - totalBeli

  function resetForm() {
    setTanggal(todayString())
    setKategori('OCM R2')
    setPeronId(peronOptions?.[0]?.id ?? '')
    setStatusBayar('belum')
    setSumberBayarId('')
    setCatatan('')
    setKeterangan('')
    setKeteranganManual(false)
    setFotos([])
    setDetails([{ ...EMPTY_DETAIL }])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validDetails = details.filter((d) => parseFloat(d.tonase) > 0 && parseFloat(d.hargaLapangan) > 0)
    if (validDetails.length === 0) {
      toast.error('Minimal 1 baris dengan tonase dan harga yang valid')
      return
    }
    setLoading(true)
    try {
      const detailInputs: DetailInput[] = validDetails.map((d) => ({
        noTid: d.noTid || undefined,
        tonase: parseFloat(d.tonase),
        hargaLapangan: parseFloat(d.hargaLapangan),
        tanggalReplas: d.tanggalReplas || undefined,
        tanggalReplasSampai: d.tanggalReplasSampai || undefined,
        jumlahReplas: d.jumlahReplas !== '' ? parseInt(d.jumlahReplas, 10) || 0 : undefined,
      }))

      const payload = {
        tanggal,
        kategori,
        peronId,
        statusBayarPeron: statusBayar,
        sumberBayarId: sumberBayarId || undefined,
        catatan: catatan || undefined,
        keterangan: keterangan || undefined,
        details: detailInputs,
        fotoUrls: fotos,
        idempotencyKey: idemKey,
      }

      if (initialData?.id) {
        await updatePembelian(initialData.id, payload)
        toast.success('Pembelian berhasil diperbarui')
      } else {
        await createPembelian(payload)
        toast.success('Pembelian berhasil ditambahkan')
      }

      setOpen(false)
      onOpenChange?.(false)
      if (!initialData) resetForm()
      setIdemKey(crypto.randomUUID()) // entri berikutnya pakai key baru
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan pembelian')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); onOpenChange?.(v) }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Pembelian' : 'Tiket Pembelian'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Baris 1: Tanggal full-width mobile, lalu Kategori + Peron */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-1 space-y-1.5">
              <Label>Tanggal *</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-1.5">
              <Label>Kategori *</Label>
              <Select value={kategori} onValueChange={(v) => setKategori(v as KategoriPembelian)}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OCM R2">OCM R2</SelectItem>
                  <SelectItem value="OCMP SAGU">OCMP SAGU</SelectItem>
                  <SelectItem value="OCM BRDL KTWM">OCM BRDL KTWM</SelectItem>
                  <SelectItem value="OCM BRDL TRYM">OCM BRDL TRYM</SelectItem>
                  <SelectItem value="OCM BRDL LMDM">OCM BRDL LMDM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-1.5">
              <Label>Peron *</Label>
              <Select value={peronId} onValueChange={(v) => { if (v) setPeronId(v) }}>
                <SelectTrigger><SelectValue placeholder="Pilih peron" /></SelectTrigger>
                <SelectContent>
                  {peronOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Referensi Harga Otomatis — sengaja TANPA harga beli & untung CV
              (kadang form diisi di depan pemilik peron). Cukup acuan & kelebihan. */}
          {!initialData && headerAcuan && (
            <div className="rounded-lg border border-stone-200 dark:border-border bg-stone-50 dark:bg-white/[0.03] px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-[#6B7280] mb-1.5">Harga Otomatis ({derivedProduk})</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-300">
                <span>Acuan: <strong className="num">Rp {headerAcuan.hargaLapangan.toLocaleString('id-ID')}</strong>/kg</span>
                <span>Kelebihan: <strong className="num">Rp {(headerAcuan.selisihJualBga - keuntunganPerKg).toLocaleString('id-ID')}</strong></span>
              </div>
            </div>
          )}
          {!initialData && !headerAcuan && !hargaLoading && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
              Harga acuan belum tersedia untuk {derivedProduk}. Tambah dulu di Harga Acuan, atau isi manual.
            </div>
          )}

          {/* Tabel Detail */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Rincian</Label>
            </div>

            <div className="rounded-lg border border-stone-200 dark:border-border overflow-hidden">
              {/* Header — Replas | Tonase | Harga | hapus. Tgl Replas pindah ke baris penuh per item. */}
              <div className="grid grid-cols-[44px_1fr_1fr_28px] gap-0 bg-stone-50 dark:bg-white/[0.03] border-b border-stone-200 dark:border-border text-[10px] sm:text-xs font-semibold uppercase text-stone-500 tracking-wide">
                <div className="px-1.5 py-2 text-right">Replas</div>
                <div className="px-1.5 py-2 text-right">Tonase</div>
                <div className="px-1.5 py-2">Rp/kg *</div>
                <div className="px-1 py-2" />
              </div>

              {/* Rows */}
              {details.map((d, idx) => {
                const ton = parseFloat(d.tonase) || 0
                const harga = parseFloat(d.hargaLapangan) || 0
                const subtotal = ton * harga
                return (
                  <div key={idx} className="border-b border-stone-100 dark:border-border last:border-b-0">
                    <div className="grid grid-cols-[44px_1fr_1fr_28px] gap-0 items-center">
                      <div className="px-1 py-1.5 min-w-0">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={d.jumlahReplas}
                          onChange={(e) => updateDetail(idx, 'jumlahReplas', e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="0"
                          className="h-8 text-sm text-right tabular-nums min-w-0 px-1"
                        />
                      </div>
                      <div className="px-1 py-1.5 min-w-0">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={d.tonase}
                          onChange={(e) => updateDetail(idx, 'tonase', e.target.value.replace(/[^0-9.]/g, ''))}
                          placeholder="0"
                          className="h-8 text-sm text-right min-w-0 px-1.5"
                        />
                      </div>
                      <div className="px-1 py-1.5 min-w-0">
                        <NumberInput
                          value={d.hargaLapangan}
                          onChange={(n) => updateDetail(idx, 'hargaLapangan', String(n))}
                          placeholder="0"
                          className="h-8 text-sm min-w-0 px-1.5"
                        />
                      </div>
                      <div className="px-0 py-1.5 flex justify-center">
                        {details.length > 1 && (
                          <button type="button" onClick={() => removeDetail(idx)} className="h-7 w-7 flex items-center justify-center rounded text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Tgl Replas — baris penuh sendiri (1 kolom): label di atas,
                        rentang Dari–Sampai dapat lebar penuh (tak lagi dijejal di grid) */}
                    <div className="px-2 pb-2 pt-0.5 space-y-1">
                      <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-stone-400 dark:text-zinc-500">
                        <CalendarDays className="h-3 w-3" />
                        Tgl Replas
                      </span>
                      <DateRangePopover
                        dari={d.tanggalReplas}
                        sampai={d.tanggalReplasSampai}
                        onChange={(from, sampai) => setRowRange(idx, from, sampai)}
                        warning={warnRange(d)}
                      />
                    </div>
                    {subtotal > 0 && (
                      <div className="px-3 pb-1.5 text-xs text-stone-500 flex gap-4">
                        <span>Subtotal: <span className="font-semibold text-stone-800 dark:text-zinc-200">{formatRupiah(subtotal)}</span></span>
                        {keuntunganPerKg > 0 && <span>H. Jual: <span className="font-medium">{(harga + keuntunganPerKg).toLocaleString('id-ID')}/kg</span></span>}
                      </div>
                    )}
                  </div>
                )
              })}

              <button
                type="button"
                onClick={addDetail}
                className="w-full px-3 py-2 text-xs text-stone-700 dark:text-zinc-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/[0.05] flex items-center gap-1.5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah baris
              </button>
            </div>

            {totalTonase > 0 && (
              <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Total Tonase</p>
                  <p className="font-semibold num">{totalTonase.toLocaleString('id-ID')} kg</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Total Bayar Peron</p>
                  <p className="font-bold text-stone-900 num">{formatRupiah(totalBeli)}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Keuntungan CV OCM</p>
                  <p className="font-bold text-green-600 num">{formatRupiah(totalKeuntungan)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Keterangan otomatis (Total N Replas + rentang) — tetap bisa diedit manual */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Keterangan</Label>
              {keteranganManual && autoKeterangan && (
                <button
                  type="button"
                  onClick={() => { setKeteranganManual(false); setKeterangan(autoKeterangan) }}
                  className="text-[11px] font-medium text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Set ulang otomatis
                </button>
              )}
            </div>
            <Input
              value={keterangan}
              onChange={(e) => { setKeterangan(e.target.value); setKeteranganManual(true) }}
              placeholder="Total — Replas"
            />
          </div>

          {/* Status bayar + Sumber bayar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status Bayar</Label>
              <Select value={statusBayar} onValueChange={(v) => setStatusBayar(v as 'belum' | 'lunas')}>
                <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="belum">Belum Dibayar</SelectItem>
                  <SelectItem value="lunas">Lunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sumber Bayar</Label>
              <Select value={sumberBayarId} onValueChange={(v) => { if (v) setSumberBayarId(v) }}>
                <SelectTrigger><SelectValue placeholder="— Pilih akun —" /></SelectTrigger>
                <SelectContent>
                  {akunOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Opsional"
            />
          </div>

          {/* Foto Bukti */}
          <div className="space-y-1.5">
            <Label>Foto Bukti</Label>
            <p className="text-xs text-stone-400">Tiket timbang, bukti penyerahan uang, dll.</p>
            <FotoBuktiUploader urls={fotos} onUrlsChange={setFotos} disabled={loading} />
          </div>

          <div className="flex justify-end gap-2 pt-4 -mx-6 px-6 -mb-6 pb-6 border-t border-border bg-muted/30 rounded-b-3xl">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading} className="bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-stone-900 text-white">
              {loading ? 'Menyimpan...' : initialData ? 'Simpan Perubahan' : 'Tambah Tiket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
