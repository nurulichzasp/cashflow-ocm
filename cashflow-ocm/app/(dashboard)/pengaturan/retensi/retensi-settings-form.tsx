'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { setRetensiSettings } from '../../peron/retensi-actions'

export function RetensiSettingsForm({ initial }: { initial: { ambang: number; minMarginTbs: number } }) {
  const [ambang, setAmbang] = useState(String(initial.ambang))
  const [minMarginTbs, setMinMarginTbs] = useState(String(initial.minMarginTbs))
  const [pending, start] = useTransition()

  function save() {
    const a = parseInt(ambang, 10)
    const m = parseInt(minMarginTbs, 10)
    if (!Number.isFinite(a) || !Number.isFinite(m)) {
      toast.error('Isi angka yang valid')
      return
    }
    start(async () => {
      try {
        await setRetensiSettings({ ambang: a, minMarginTbs: m })
        toast.success('Pengaturan retensi tersimpan')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
      }
    })
  }

  return (
    <div className="surface space-y-5 p-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="ambang">Ambang loyalitas (Rp/kg)</Label>
        <Input id="ambang" inputMode="numeric" value={ambang} onChange={(e) => setAmbang(e.target.value)} />
        <p className="text-xs text-stone-400 dark:text-zinc-500">
          Gap harga ≤ nilai ini dianggap aman — peron tak pindah karena inersia. Default 20.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="min-tbs">Floor untung CV TBS (Rp/kg)</Label>
        <Input id="min-tbs" inputMode="numeric" value={minMarginTbs} onChange={(e) => setMinMarginTbs(e.target.value)} />
        <p className="text-xs text-stone-400 dark:text-zinc-500">
          Batas bawah untung CV TBS saat mempertahankan. Brondolan ter-floor otomatis oleh cap. Default 40.
        </p>
      </div>
      <Button onClick={save} disabled={pending}>{pending ? 'Menyimpan…' : 'Simpan'}</Button>
    </div>
  )
}
