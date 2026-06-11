'use client'

import { useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { refreshPeronHealth } from '../health-actions'

export function RefreshButton() {
  const [pending, start] = useTransition()
  const [spin, setSpin] = useState(false)

  function handle() {
    setSpin(true)
    start(async () => {
      try {
        const res = await refreshPeronHealth()
        toast.success(`Kesehatan peron diperbarui (${res.peronCount} peron)`)
      } catch {
        toast.error('Gagal memperbarui. Coba lagi.')
      } finally {
        setSpin(false)
      }
    })
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      aria-label="Perbarui kesehatan peron"
      className="tap-pad inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-50"
    >
      <RefreshCw className={cn('h-[18px] w-[18px]', (spin || pending) && 'animate-spin')} strokeWidth={2} />
    </button>
  )
}
