'use client'
/* eslint-disable @next/next/no-img-element -- bukti privat memakai URL proxy terautentikasi */

import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Image as ImageIcon, ImageOff } from 'lucide-react'
import { fotoUrl } from '@/lib/foto-url'
import { cn } from '@/lib/utils'

interface Props {
  urls: string[]
  maxThumbnails?: number
}

/** <img> dengan fallback rapi saat foto gagal dimuat (sinyal jelek di lapangan). */
function FotoImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false)
  if (broken) {
    return (
      <div className={cn('flex items-center justify-center bg-stone-100 text-stone-400 dark:bg-white/[0.06] dark:text-zinc-500', className)}>
        <ImageOff className="h-1/2 w-1/2" strokeWidth={1.5} />
      </div>
    )
  }
  return <img src={src} alt={alt} onError={() => setBroken(true)} className={className} />
}

export function FotoBuktiGallery({ urls, maxThumbnails = 4 }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  function openLightbox(idx: number) { setLightboxIdx(idx) }
  function closeLightbox() { setLightboxIdx(null) }
  function prev() { setLightboxIdx((i) => (i !== null ? (i - 1 + urls.length) % urls.length : 0)) }
  function next() { setLightboxIdx((i) => (i !== null ? (i + 1) % urls.length : 0)) }

  useEffect(() => {
    if (lightboxIdx === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxIdx(null)
      else if (e.key === 'ArrowLeft') setLightboxIdx((i) => (i !== null ? (i - 1 + urls.length) % urls.length : 0))
      else if (e.key === 'ArrowRight') setLightboxIdx((i) => (i !== null ? (i + 1) % urls.length : 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIdx, urls.length])

  // Semua Hook wajib dipanggil sebelum early return agar urutannya stabil ketika
  // daftar foto berubah dari kosong menjadi berisi (atau sebaliknya).
  if (urls.length === 0) return null

  const visible = urls.slice(0, maxThumbnails)
  const rest = urls.length - maxThumbnails

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => openLightbox(i)}
            className="relative h-14 w-14 rounded-md overflow-hidden border border-stone-200 hover:border-stone-400 dark:hover:border-stone-500 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          >
            <FotoImg src={fotoUrl(url)} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
          </button>
        ))}
        {rest > 0 && (
          <button
            type="button"
            onClick={() => openLightbox(maxThumbnails)}
            className="h-14 w-14 rounded-md bg-stone-100 border border-stone-200 flex items-center justify-center text-xs font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
          >
            +{rest}
          </button>
        )}
      </div>

      {lightboxIdx !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau foto ${lightboxIdx + 1} dari ${urls.length}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fotoUrl(urls[lightboxIdx])}
              alt={`Foto ${lightboxIdx + 1}`}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            />

            <button
              type="button"
              onClick={closeLightbox}
              autoFocus
              aria-label="Tutup pratinjau"
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white text-stone-800 flex items-center justify-center shadow-lg hover:bg-stone-100"
            >
              <X className="h-4 w-4" />
            </button>

            {urls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Foto sebelumnya"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Foto berikutnya"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 rounded-full px-2.5 py-0.5">
              {lightboxIdx + 1} / {urls.length}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function FotoCount({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-stone-500">
      <ImageIcon className="h-3.5 w-3.5" />
      {count}
    </span>
  )
}
