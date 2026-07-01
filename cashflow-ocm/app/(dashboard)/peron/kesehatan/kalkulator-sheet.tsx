'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusPill } from '@/components/ui/status-pill'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { formatRupiah } from '@/lib/format'
import {
  hitungPertahanan,
  isProdukTBSName,
  RETENSI_PRODUK,
  type RetensiProduk,
} from '@/lib/retensi'
import { catatAncaman, terapkanDanCatat } from '../retensi-actions'
import type { AcuanMap } from '../retensi-actions'
import type { RetensiSettings } from '@/lib/retensi'

export interface KalkulatorContextProp {
  peron: { id: string; nama: string; keuntunganPerKg: number }
  isUmum: boolean
  settings: RetensiSettings
  acuanMap: AcuanMap
  volume: number | null
}

interface Props {
  context: KalkulatorContextProp
  canApply: boolean
  canCreate: boolean
  children: React.ReactElement
}

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

export function KalkulatorSheet({ context, canApply, canCreate, children }: Props) {
  const { peron, isUmum, settings, acuanMap } = context
  const [open, setOpen] = useState(false)
  const [produk, setProduk] = useState<RetensiProduk>('BRDL TRYM')
  const [acuanStr, setAcuanStr] = useState<string>(String(acuanMap['BRDL TRYM'] ?? ''))
  const [kompetitorStr, setKompetitorStr] = useState('')
  const [volumeStr, setVolumeStr] = useState<string>(context.volume != null ? String(Math.round(context.volume)) : '')
  const [tindakan, setTindakan] = useState<'dipantau' | 'dibiarkan'>('dipantau')
  const [catatan, setCatatan] = useState('')
  const [pending, start] = useTransition()

  function onProdukChange(v: string) {
    const p = v as RetensiProduk
    setProduk(p)
    setAcuanStr(String(acuanMap[p] ?? '')) // auto-isi acuan produk, tetap bisa override
  }

  const acuan = parseNum(acuanStr)
  const kompetitor = parseNum(kompetitorStr)
  const volume = parseNum(volumeStr)
  const isTBS = isProdukTBSName(produk)

  const hasil = useMemo(() => {
    if (acuan == null || acuan <= 0 || kompetitor == null || kompetitor <= 0) return null
    return hitungPertahanan({
      keuntunganPerKg: peron.keuntunganPerKg,
      isTBS,
      acuan,
      hargaKompetitor: kompetitor,
      volume: volume != null && volume > 0 ? volume : null,
      ambang: settings.ambang,
      minMarginTbs: settings.minMarginTbs,
    })
  }, [acuan, kompetitor, volume, isTBS, peron.keuntunganPerKg, settings.ambang, settings.minMarginTbs])

  const canSubmitCatat = hasil != null && acuan != null && kompetitor != null
  const showTerapkan = canApply && hasil?.status === 'terancam' && hasil.turunMargin > 0

  function baseAncamanPayload() {
    return {
      peronId: peron.id,
      produk,
      hargaAcuanSaat: Math.round(acuan!),
      hargaKompetitor: Math.round(kompetitor!),
      keuntunganSebelum: peron.keuntunganPerKg,
      volumeAcuan: volume != null && volume > 0 ? volume : null,
      catatan: catatan.trim() || null,
    }
  }

  function submitCatat() {
    if (!canSubmitCatat) return
    start(async () => {
      try {
        await catatAncaman({ ...baseAncamanPayload(), keuntunganSesudah: null, tindakan })
        toast.success(tindakan === 'dibiarkan' ? 'Dicatat — peron direlakan' : 'Ancaman dicatat (dipantau)')
        setOpen(false)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
      }
    })
  }

  function submitTerapkan() {
    if (!hasil || hasil.status !== 'terancam') return
    start(async () => {
      try {
        await terapkanDanCatat({ ...baseAncamanPayload(), keuntunganSesudah: hasil.Kbaru, tindakan: 'dipertahankan' })
        toast.success(`Untung CV ${peron.nama} diset ${hasil.Kbaru}/kg & dicatat`)
        setOpen(false)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal menerapkan')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={children} />
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-0">
          <SheetTitle>Kalkulator Pertahanan · {peron.nama}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          {isUmum && (
            <div className="flex items-start gap-2 rounded-lg bg-[#FEF2F2] px-3 py-2 dark:bg-[#DC2626]/10">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626] dark:text-[#F87171]" />
              <p className="text-xs text-[#B45309] dark:text-[#FBBF24]">
                <b>&quot;Umum&quot;</b> adalah peron catch-all, bukan satu hubungan. Menurunkan marginnya berdampak ke banyak setoran — biasanya jangan dijadikan target retensi.
              </p>
            </div>
          )}

          {/* Input */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Produk terancam</Label>
              <Select value={produk} onValueChange={onProdukChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RETENSI_PRODUK.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Untung CV sekarang</Label>
              <div className="flex h-10 items-center rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm font-medium tabular-nums text-stone-700 dark:border-border dark:bg-white/[0.03] dark:text-stone-200">
                Rp {peron.keuntunganPerKg.toLocaleString('id-ID')}/kg
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acuan">Harga acuan (Rp/kg)</Label>
              <Input id="acuan" inputMode="numeric" value={acuanStr} onChange={(e) => setAcuanStr(e.target.value)} placeholder="mis. 2.500" />
              {(acuan == null || acuan <= 0) && <p className="text-xs text-[#B45309] dark:text-[#FBBF24]">Acuan produk ini belum ada — isi manual.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kompetitor">Harga kompetitor (Rp/kg)</Label>
              <Input id="kompetitor" inputMode="numeric" value={kompetitorStr} onChange={(e) => setKompetitorStr(e.target.value)} placeholder="yang peron lapor" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="volume">Volume/periode (kg)</Label>
            <Input id="volume" inputMode="numeric" value={volumeStr} onChange={(e) => setVolumeStr(e.target.value)} placeholder="tonase minggu terakhir" />
            <p className="text-xs text-stone-400 dark:text-zinc-500">Ambang loyalitas: Rp {settings.ambang}/kg · floor TBS Rp {settings.minMarginTbs}/kg</p>
          </div>

          {/* Output */}
          {hasil && (
            <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 dark:border-border dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-700 dark:text-zinc-200">Status</span>
                {hasil.status === 'aman'
                  ? <StatusPill tone="ok"><ShieldCheck className="h-3 w-3" /> Aman</StatusPill>
                  : <StatusPill tone={hasil.bisaDipertahankanPenuh ? 'warn' : 'crit'}>Terancam</StatusPill>}
              </div>

              {hasil.status === 'aman' ? (
                <p className="text-[13px] text-stone-600 dark:text-zinc-300">
                  Gap {formatRupiah(hasil.gap)}/kg ≤ ambang {formatRupiah(hasil.ambang)}. <b>Jangan turunkan margin</b> — peron tak dalam risiko pindah.
                </p>
              ) : (
                <>
                  <OutRow label="Gap sekarang" value={`${formatRupiah(hasil.gap)}/kg`} tone="crit" />
                  <OutRow label="Untung CV usulan" value={`Rp ${hasil.Kbaru.toLocaleString('id-ID')}/kg`} strong />
                  <OutRow label="Kelebihan peron baru" value={`Rp ${hasil.kelebihanBaru.toLocaleString('id-ID')}/kg`} />
                  <OutRow label="Harga OCM baru" value={`Rp ${hasil.hargaOCMbaru.toLocaleString('id-ID')}/kg`} />
                  <OutRow label="Gap sisa" value={`${formatRupiah(hasil.gapSisa)}/kg`} tone={hasil.bisaDipertahankanPenuh ? 'ok' : 'warn'} />

                  {hasil.bisaDipertahankanPenuh ? (
                    <div className="rounded-lg bg-[var(--ok)]/10 px-3 py-2 text-xs text-[var(--ok-fg)]">
                      Bisa dipertahankan penuh — turunkan untung CV ke <b>Rp {hasil.Kbaru.toLocaleString('id-ID')}</b>, gap sisa turun ke ambang.
                    </div>
                  ) : hasil.mentokCap ? (
                    <div className="rounded-lg bg-[#FEF2F2] px-3 py-2 text-xs text-[#B45309] dark:bg-[#DC2626]/10 dark:text-[#FBBF24]">
                      <b>Mentok cap brondolan.</b> Harga OCM tak bisa naik lagi (kelebihan sudah maksimal). Menurunkan untung CV lebih jauh <b>tak menaikkan harga</b>. Pilihan: relakan, atau naikkan cap global di <code>lib/harga.ts</code> — <b>berdampak SEMUA peron</b>.
                    </div>
                  ) : (
                    <div className="rounded-lg bg-[#FFFBEB] px-3 py-2 text-xs text-[#B45309] dark:bg-[#D97706]/10 dark:text-[#FBBF24]">
                      Sudah di floor margin {isTBS ? 'TBS' : 'produk'} (Rp {hasil.floor.toLocaleString('id-ID')}) tapi gap sisa masih {formatRupiah(hasil.gapSisa)}. Keputusan bisnis: relakan atau terima margin sangat tipis.
                    </div>
                  )}

                  {hasil.turunMargin > 0 && (
                    <div className="flex items-start gap-2 rounded-lg bg-[#FFFBEB] px-3 py-2 dark:bg-[#D97706]/10">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309] dark:text-[#FBBF24]" />
                      <p className="text-xs text-[#B45309] dark:text-[#FBBF24]">
                        Untung CV <b>per-peron lintas SEMUA produk</b>. Menurunkannya ke {hasil.Kbaru} juga menurunkan margin produk lain peron ini (mis. TBS).
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Cost/benefit */}
              <div className="space-y-1.5 border-t border-stone-200 pt-2.5 dark:border-border">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
                  Per periode {volume != null && volume > 0 ? `(${volume.toLocaleString('id-ID')} kg)` : ''}
                </p>
                <OutRow label="Biaya pertahanan" value={hasil.biayaPertahanan != null ? formatRupiah(hasil.biayaPertahanan) : '—'} />
                <OutRow label="Laba dipertahankan" value={hasil.labaDipertahankan != null ? formatRupiah(hasil.labaDipertahankan) : '—'} tone="ok" />
                <OutRow label="Laba hilang jika lepas" value={hasil.labaRisikoJikaLepas != null ? formatRupiah(hasil.labaRisikoJikaLepas) : '—'} tone="crit" />
                {(hasil.volume == null) && <p className="text-xs text-stone-400 dark:text-zinc-500">Isi volume untuk menghitung rupiah.</p>}
              </div>
            </div>
          )}

          {/* Catatan + tindakan + aksi */}
          {(canCreate || canApply) && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="catatan-ancaman">Catatan (opsional)</Label>
                <Textarea id="catatan-ancaman" rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. kompetitor X nawar, peron ragu" />
              </div>

              {showTerapkan && (
                <button
                  onClick={submitTerapkan}
                  disabled={pending}
                  className="tactile h-12 w-full rounded-xl bg-[var(--brand-solid)] text-base font-semibold text-white hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                >
                  {pending ? 'Menyimpan…' : `Terapkan untung CV ${hasil!.Kbaru} & catat`}
                </button>
              )}

              {canCreate && (
                <div className="flex gap-2">
                  <Select value={tindakan} onValueChange={(v) => setTindakan(v as 'dipantau' | 'dibiarkan')}>
                    <SelectTrigger className="w-36 shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dipantau">Dipantau</SelectItem>
                      <SelectItem value="dibiarkan">Dibiarkan/relakan</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    onClick={submitCatat}
                    disabled={pending || !canSubmitCatat}
                    className="tactile h-11 flex-1 rounded-xl border border-stone-300 text-sm font-semibold text-stone-700 hover:bg-stone-50 active:scale-[0.98] disabled:opacity-50 dark:border-border dark:text-zinc-200 dark:hover:bg-white/[0.04]"
                  >
                    Catat ancaman
                  </button>
                </div>
              )}
              {!canApply && canCreate && (
                <p className="text-center text-xs text-stone-400 dark:text-zinc-500">Terapkan ke margin hanya untuk owner.</p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function OutRow({ label, value, tone, strong }: { label: string; value: string; tone?: 'ok' | 'warn' | 'crit'; strong?: boolean }) {
  const toneClass = tone === 'ok' ? 'text-[var(--ok-fg)]' : tone === 'crit' ? 'text-[#DC2626] dark:text-[#F87171]' : tone === 'warn' ? 'text-[#B45309] dark:text-[#FBBF24]' : 'text-stone-900 dark:text-zinc-100'
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-stone-500 dark:text-zinc-400">{label}</span>
      <span className={`text-[13px] tabular-nums ${strong ? 'font-bold' : 'font-semibold'} ${toneClass}`}>{value}</span>
    </div>
  )
}
