/**
 * Header standar sub-halaman pengaturan: judul + deskripsi.
 * (Tautan kembali DIHAPUS — navigasi back kini lewat tombol glass di header global,
 * lihat components/mobile-header.tsx. Hindari dua tombol back.)
 */
export function SettingHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-zinc-50">{title}</h1>
      {description && (
        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{description}</p>
      )}
    </div>
  )
}
