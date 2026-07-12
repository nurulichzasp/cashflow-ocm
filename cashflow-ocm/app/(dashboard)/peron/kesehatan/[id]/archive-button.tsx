'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Archive } from 'lucide-react'
import { archivePeron } from '../../health-actions'

export function ArchiveButton({ peronId }: { peronId: string }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <button
      onClick={() => start(async () => {
        try {
          await archivePeron(peronId)
          toast.success('Peron diarsipkan dari pemantauan')
          router.push('/peron?view=kesehatan')
        } catch {
          toast.error('Gagal mengarsipkan')
        }
      })}
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-50"
    >
      <Archive className="h-4 w-4" /> {pending ? 'Mengarsipkan…' : 'Arsipkan peron'}
    </button>
  )
}
