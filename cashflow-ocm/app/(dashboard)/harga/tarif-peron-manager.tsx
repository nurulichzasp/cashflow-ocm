'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarClock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/number-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { deleteTarifPeron, upsertTarifPeron } from './actions'
import { formatTanggal } from '@/lib/format'

type Props = {
  perons: Array<{ id: string; nama: string }>
  rows: Array<{ id: string; peronId: string; peronNama: string; tanggalBerlaku: string; kelebihanPerKg: number; brdlSamaTbs: boolean; catatan: string | null }>
  isOwner: boolean
}

export function TarifPeronManager({ perons, rows, isOwner }: Props) {
  const [peronId, setPeronId] = useState(perons[0]?.id ?? '')
  const [tanggal, setTanggal] = useState('2026-08-15')
  const [kelebihan, setKelebihan] = useState(70)
  const [brdlSamaTbs, setBrdlSamaTbs] = useState(true)
  const [catatan, setCatatan] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await upsertTarifPeron({ peronId, tanggalBerlaku: tanggal, kelebihanPerKg: kelebihan, brdlSamaTbs, catatan })
      toast.success('Jadwal kelebihan peron tersimpan')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan tarif')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    try {
      await deleteTarifPeron(id)
      toast.success('Jadwal tarif dihapus')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus tarif')
    }
  }

  return (
    <section className="surface overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          <h2 className="font-semibold">Jadwal Kelebihan Peron</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Perubahan berlaku berdasarkan tanggal transaksi; histori lama tetap beku.</p>
      </div>

      {isOwner && (
        <form onSubmit={save} className="grid gap-3 border-b border-border p-4 md:grid-cols-5">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Peron</Label>
            <Select value={peronId} onValueChange={setPeronId}>
              <SelectTrigger><SelectValue placeholder="Pilih peron" /></SelectTrigger>
              <SelectContent>{perons.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tanggal berlaku</Label>
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Kelebihan (Rp/kg)</Label>
            <NumberInput value={kelebihan} onChange={setKelebihan} placeholder="70" />
          </div>
          <div className="flex items-end">
            <Button className="w-full" type="submit" disabled={saving || !peronId || !tanggal}>{saving ? 'Menyimpan…' : 'Simpan Tarif'}</Button>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 md:col-span-2">
            <div><p className="text-sm font-medium">BRDL sama dengan TBS</p><p className="text-xs text-muted-foreground">Kelebihan tidak terkena batas lama Rp50.</p></div>
            <Switch checked={brdlSamaTbs} onCheckedChange={setBrdlSamaTbs} />
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label>Catatan</Label>
            <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={200} placeholder="Alasan perubahan (opsional)" />
          </div>
        </form>
      )}

      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">{row.peronNama} · Rp {row.kelebihanPerKg.toLocaleString('id-ID')}/kg</p>
              <p className="text-xs text-muted-foreground">Mulai {formatTanggal(row.tanggalBerlaku)} · BRDL {row.brdlSamaTbs ? 'sama TBS' : 'batas lama'}{row.catatan ? ` · ${row.catatan}` : ''}</p>
            </div>
            {isOwner && <Button type="button" size="icon" variant="ghost" aria-label="Hapus jadwal tarif" onClick={() => void remove(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
          </div>
        ))}
        {rows.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Belum ada jadwal khusus; tarif dasar peron masih berlaku.</p>}
      </div>
    </section>
  )
}
