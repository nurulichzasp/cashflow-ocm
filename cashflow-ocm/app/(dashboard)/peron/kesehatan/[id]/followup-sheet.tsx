'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { createFollowup } from '../../health-actions'

type Reason = 'harga_kalah' | 'pindah_cv' | 'masalah_operasional' | 'memang_musim' | 'lainnya'
type Outcome = 'kembali_normal' | 'masih_pantau' | 'hilang'

const REASONS: { v: Reason; l: string }[] = [
  { v: 'harga_kalah', l: 'Harga kalah' },
  { v: 'pindah_cv', l: 'Pindah CV / PKS lain' },
  { v: 'masalah_operasional', l: 'Masalah operasional' },
  { v: 'memang_musim', l: 'Memang musim' },
  { v: 'lainnya', l: 'Lainnya' },
]
const OUTCOMES: { v: Outcome; l: string }[] = [
  { v: 'kembali_normal', l: 'Kembali normal' },
  { v: 'masih_pantau', l: 'Masih pantau' },
  { v: 'hilang', l: 'Hilang (arsipkan)' },
]

export function FollowupSheet({ peronId, status }: { peronId: string; status: string }) {
  const [open, setOpen] = useState(false)
  const [contacted, setContacted] = useState(false)
  const [reason, setReason] = useState<Reason | ''>('')
  const [note, setNote] = useState('')
  const [outcome, setOutcome] = useState<Outcome | ''>('')
  const [pending, start] = useTransition()

  function submit() {
    start(async () => {
      try {
        await createFollowup({
          peronId,
          triggeredStatus: status,
          contacted,
          reason: reason || null,
          note: note.trim() || null,
          outcome: outcome || null,
        })
        toast.success(outcome === 'hilang' ? 'Tindak lanjut disimpan · peron diarsipkan' : 'Tindak lanjut tersimpan')
        setOpen(false)
        setContacted(false); setReason(''); setNote(''); setOutcome('')
      } catch {
        toast.error('Gagal menyimpan. Coba lagi.')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="tactile inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-solid)] text-base font-semibold text-white shadow-[0_8px_24px_rgba(14,122,88,0.35)] hover:brightness-110 active:scale-[0.98]"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} /> Tindak Lanjut
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="px-0">
          <SheetTitle>Tindak Lanjut Peron</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 pb-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="contacted" className="text-sm font-medium">Sudah dihubungi?</Label>
            <Switch id="contacted" checked={contacted} onCheckedChange={setContacted} aria-label="Sudah dihubungi" />
          </div>

          <div className="space-y-1.5">
            <Label>Alasan</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as Reason)}>
              <SelectTrigger><SelectValue placeholder="Pilih alasan" /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea rows={3} placeholder="mis. harga kalah Rp10/kg, minta disesuaikan" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Hasil (opsional)</Label>
            <Select value={outcome} onValueChange={(v) => setOutcome(v as Outcome)}>
              <SelectTrigger><SelectValue placeholder="Pilih hasil" /></SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
              </SelectContent>
            </Select>
            {outcome === 'hilang' && (
              <p className="text-[12px] text-stone-400 dark:text-zinc-500">Peron akan diarsipkan & berhenti memicu alarm.</p>
            )}
          </div>

          <button
            onClick={submit}
            disabled={pending}
            className="tactile h-12 w-full rounded-xl bg-[var(--brand-solid)] text-base font-semibold text-white hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
