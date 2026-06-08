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
import { Camera, Loader2, Eye, Info } from 'lucide-react'
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
    nickname?: string | null
    fullName?: string | null
    personalEmail?: string | null
    phone?: string | null
    address?: string | null
  }
  children: React.ReactNode
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 400
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
  const [viewPhotoOpen, setViewPhotoOpen] = useState(false)
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)

  // Fields state
  const [nickname, setNickname] = useState(user.nickname || '')
  const [fullName, setFullName] = useState(user.fullName || user.name || '')
  const [personalEmail, setPersonalEmail] = useState(user.personalEmail || '')
  const [phone, setPhone] = useState(user.phone || '')
  const [address, setAddress] = useState(user.address || '')

  const [image, setImage] = useState<string | null>(user.image || null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Reset local state when dialog is opened/closed to sync with user changes
  React.useEffect(() => {
    if (open) {
      setNickname(user.nickname || '')
      setFullName(user.fullName || user.name || '')
      setPersonalEmail(user.personalEmail || '')
      setPhone(user.phone || '')
      setAddress(user.address || '')
      setImage(user.image || null)
      setShowPhotoOptions(false)
    }
  }, [user, open])

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
    if (!fullName.trim()) {
      toast.error('Nama Panjang wajib diisi')
      return
    }
    if (!phone.trim()) {
      toast.error('No WA wajib diisi')
      return
    }
    if (!personalEmail.trim()) {
      toast.error('Email Pribadi wajib diisi')
      return
    }
    if (!address.trim()) {
      toast.error('Alamat wajib diisi')
      return
    }

    setSaving(true)
    try {
      await updateProfile({
        name: fullName.trim(),
        fullName: fullName.trim(),
        nickname: nickname.trim(),
        personalEmail: personalEmail.trim(),
        phone: phone.trim(),
        address: address.trim(),
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

  const displayName = nickname || fullName || user.name
  const initials = displayName
    ? displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[500px] dark:bg-card">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight">Akun Saya</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5 py-1">
            
            {/* Custom Avatar Trigger & Choices */}
            <div className="relative flex flex-col items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                className="relative group cursor-pointer select-none rounded-full outline-none focus:ring-2 focus:ring-orange-500 border-none bg-transparent p-0"
              >
                <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 flex items-center justify-center transition-all group-hover:opacity-85">
                  {image ? (
                    <img src={fotoUrl(image)} alt={displayName} className="h-full w-full object-cover" />
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
              </button>

              {/* Custom state-controlled floating menu */}
              {showPhotoOptions && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPhotoOptions(false)} />
                  <div className="absolute top-22 z-50 bg-white dark:bg-[#28282B] border border-stone-200 dark:border-stone-800 rounded-lg shadow-lg py-1 w-36 overflow-hidden">
                    {image && (
                      <button
                        type="button"
                        onClick={() => {
                          setViewPhotoOpen(true)
                          setShowPhotoOptions(false)
                        }}
                        className="w-full px-3 py-2 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 text-left flex items-center gap-2 font-medium cursor-pointer border-none bg-transparent outline-none"
                      >
                        <Eye className="h-3.5 w-3.5 text-stone-400" />
                        Lihat Foto
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current?.click()
                        setShowPhotoOptions(false)
                      }}
                      className="w-full px-3 py-2 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 text-left flex items-center gap-2 font-medium cursor-pointer border-none bg-transparent outline-none"
                    >
                      <Camera className="h-3.5 w-3.5 text-stone-400" />
                      Ubah Foto
                    </button>
                  </div>
                </>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                disabled={uploading || saving}
              />
              <p className="text-[10px] text-muted-foreground">Klik foto untuk pilihan</p>
            </div>

            {/* Profile Fields Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="fullName" className="text-xs font-semibold text-stone-500">
                  Nama Panjang <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama lengkap sesuai KTP"
                  disabled={saving || uploading}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="nickname" className="text-xs font-semibold text-stone-500">
                  Nama Panggilan
                </Label>
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Nama panggilan"
                  disabled={saving || uploading}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs font-semibold text-stone-500">
                  No WA (WhatsApp) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  disabled={saving || uploading}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="personalEmail" className="text-xs font-semibold text-stone-500">
                  Email Pribadi <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="personalEmail"
                  type="email"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  placeholder="email@pribadi.com"
                  disabled={saving || uploading}
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="address" className="text-xs font-semibold text-stone-500">
                  Alamat <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat lengkap domisili"
                  disabled={saving || uploading}
                  required
                />
              </div>
            </div>

            {/* System Info Block */}
            <div className="rounded-lg bg-stone-50 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800/80 p-3 text-xs space-y-1 text-stone-500">
              <p className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-stone-500 dark:text-zinc-400 shrink-0" /> Akun Sistem (Hanya-Baca)
              </p>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-stone-400">Email Login</span>
                  <p className="font-medium text-stone-700 dark:text-stone-300">{user.email}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-stone-400">Peran Sistem</span>
                  <p className="font-medium text-stone-700 dark:text-stone-300 capitalize">{user.role}</p>
                </div>
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
              <Button type="submit" disabled={saving || uploading} className="bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-stone-900 text-white">
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

      {/* Lightbox / View Photo Dialog */}
      <Dialog open={viewPhotoOpen} onOpenChange={setViewPhotoOpen}>
        <DialogContent className="max-w-[420px] p-0 overflow-hidden bg-transparent border-none flex items-center justify-center shadow-none">
          {image && (
            <img src={fotoUrl(image)} alt={displayName} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
