'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  urls: string[]
  onUrlsChange: (urls: string[]) => void
  disabled?: boolean
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 1280
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width)
          width = MAX
        } else {
          width = Math.round((width * MAX) / height)
          height = MAX
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas tidak tersedia')); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Kompresi gagal')); return }
        resolve(blob)
      }, 'image/jpeg', 0.7)
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Gambar tidak valid')) }
    img.src = objectUrl
  })
}

async function uploadFoto(file: File): Promise<string> {
  const compressed = await compressImage(file)
  const fd = new FormData()
  fd.append('file', compressed, file.name.replace(/\.[^.]+$/, '.jpg'))
  const res = await fetch('/api/upload-foto', { method: 'POST', body: fd })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Upload gagal')
  }
  const data = await res.json()
  return data.url as string
}

export function FotoBuktiUploader({ urls, onUrlsChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    e.target.value = ''

    setUploading(true)
    try {
      const newUrls: string[] = []
      for (const file of files) {
        try {
          const url = await uploadFoto(file)
          newUrls.push(url)
        } catch {
          toast.error(`Gagal upload ${file.name}`)
        }
      }
      if (newUrls.length > 0) {
        onUrlsChange([...urls, ...newUrls])
        toast.success(`${newUrls.length} foto berhasil diupload`)
      }
    } finally {
      setUploading(false)
    }
  }

  function removeUrl(url: string) {
    onUrlsChange(urls.filter((u) => u !== url))
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFiles}
        disabled={disabled || uploading}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 border-stone-200 text-stone-700 hover:bg-stone-50"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        {uploading ? 'Mengupload...' : 'Ambil / Lampirkan Foto'}
      </Button>

      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {urls.map((url) => (
            <div key={url} className="relative group">
              <img
                src={url}
                alt="Foto bukti"
                className="h-20 w-20 rounded-lg object-cover border border-stone-200"
              />
              <button
                type="button"
                onClick={() => removeUrl(url)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Hapus foto"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
