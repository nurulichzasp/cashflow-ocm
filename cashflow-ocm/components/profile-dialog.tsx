'use client'

import React, { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Camera, Loader2, User, Mail, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { updateProfile } from '@/app/(dashboard)/pengaturan/actions'
import { useRouter } from 'next/navigation'
import { fotoUrl } from '@/lib/foto-url'

interface ProfileDialogProps {
  user: {
    id: string
    name: string
    email: string
    image?: string | null
    role: string
  }
  children: React.ReactNode
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 400 // Profile pic doesn't need to be large
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
      }, 'image/jpeg', 0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Gambar tidak valid')) }
    img.src = objectUrl
  })
}

export function ProfileDialog({ user, children }: ProfileDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(user.name)
  const [image, setImage] = useState<string | null>(user.image || null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const compressed = await compressImage(file)
      const fd = new FormData()
      fd.append('file', compressed, 'avatar.jpg')

      const res = await fetch('/api/upload-foto', {
        method: 'POST',
        body: fd,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Upload gagal')
      }

      const data = await res.json()
      setImage(data.url)
      toast.success('Foto profil berhasil diunggah')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah foto'
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Nama tidak boleh kosong')
      return
    }

    setSaving(true)
    try {
      await updateProfile({
        name: name.trim(),
        image: image || '',
      })
      toast.success('Profil berhasil diperbarui')
      setOpen(false)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui profil'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px] dark:bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight">Akun Saya</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-5 py-2">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 flex items-center justify-center transition-all group-hover:opacity-85">
                {image ? (
                  <img src={fotoUrl(image)} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-stone-500 dark:text-stone-400">{initials}</span>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              disabled={uploading || saving}
            />
            <p className="text-[11px] text-muted-foreground">Klik foto untuk mengganti</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Nama Lengkap
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Lengkap"
                disabled={saving || uploading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </Label>
              <Input
                value={user.email}
                disabled
                className="bg-stone-50 dark:bg-stone-900/50 cursor-not-allowed text-stone-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Peran
              </Label>
              <Input
                value={user.role === 'owner' ? 'Owner (Pemilik)' : 'Admin'}
                disabled
                className="bg-stone-50 dark:bg-stone-900/50 cursor-not-allowed text-stone-500 capitalize"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving || uploading}
              className="border-stone-200"
            >
              Batal
            </Button>
            <Button type="submit" disabled={saving || uploading} className="bg-orange-600 hover:bg-orange-700 text-white">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Perubahan'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
