'use client'

import { Plus, Trash2, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/number-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PrahBastRow } from '@/lib/bast-prah'
import { PRAH_TRUK_LABEL, type PrahTruk } from '@/lib/prah-trek'

export function PrahBastRowsEditor({
  rows,
  onChange,
  defaultDate,
  readOnly = false,
}: {
  rows: PrahBastRow[]
  onChange: (rows: PrahBastRow[]) => void
  defaultDate: string
  readOnly?: boolean
}) {
  function update(index: number, patch: Partial<PrahBastRow>) {
    onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row))
  }

  function add(truk: PrahTruk) {
    onChange([...rows, {
      key: crypto.randomUUID(),
      tanggal: defaultDate,
      truk,
      noTid: '',
      tonaseKotor: 0,
      tonaseNetto1: 0,
    }])
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.key} className="rounded-xl border border-border bg-muted/25 p-3">
          <div className="mb-3 flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <p className="flex-1 text-sm font-semibold">Perjalanan {index + 1}</p>
            {!readOnly && (
              <button type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))} aria-label={`Hapus perjalanan ${index + 1}`} className="rounded-md p-1.5 text-stone-400 hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`bast-row-date-${row.key}`}>Tanggal</Label>
              <Input id={`bast-row-date-${row.key}`} type="date" value={row.tanggal} onChange={(event) => update(index, { tanggal: event.target.value })} required disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`bast-row-truck-${row.key}`}>Truk / sopir</Label>
              <Select value={row.truk} onValueChange={(value) => update(index, { truk: value as PrahTruk })} disabled={readOnly}>
                <SelectTrigger id={`bast-row-truck-${row.key}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRAH_TRUK_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor={`bast-row-tid-${row.key}`}>No. TID</Label>
              <Input id={`bast-row-tid-${row.key}`} value={row.noTid} onChange={(event) => update(index, { noTid: event.target.value })} placeholder="Opsional, tetapi membantu mencegah data ganda" disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`bast-row-gross-${row.key}`}>Tonase kotor (kg)</Label>
              <NumberInput id={`bast-row-gross-${row.key}`} value={row.tonaseKotor} onChange={(value) => update(index, { tonaseKotor: value })} placeholder="0" disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`bast-row-net-${row.key}`}>Netto 1 (kg)</Label>
              <NumberInput id={`bast-row-net-${row.key}`} value={row.tonaseNetto1} onChange={(value) => update(index, { tonaseNetto1: value })} placeholder="0" disabled={readOnly} />
            </div>
          </div>
        </div>
      ))}
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => add('katimin')}><Plus className="h-3.5 w-3.5" /> Katimin</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => add('doni')}><Plus className="h-3.5 w-3.5" /> Doni</Button>
        </div>
      )}
    </div>
  )
}
