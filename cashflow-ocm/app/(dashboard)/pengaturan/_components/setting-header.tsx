import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

/**
 * Header standar untuk sub-halaman pengaturan: tautan kembali + judul + deskripsi.
 */
export function SettingHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="space-y-3">
      <Link
        href="/pengaturan"
        className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-zinc-100 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Pengaturan
      </Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-zinc-50">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{description}</p>
        )}
      </div>
    </div>
  )
}
