export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThermalPrinterSettings } from './thermal-printer-settings'

export default async function PengaturanPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  if (session.user.role !== 'owner') redirect('/dashboard')

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground text-sm">
          Kelola profil dan akses akun CV OCM. Hanya owner yang dapat mengakses halaman ini.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Akun Saya</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Nama</p>
            <p className="mt-1 font-medium">{session.user.name}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
            <p className="mt-1 font-medium">{session.user.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Peran</p>
            <p className="mt-1 font-medium capitalize">{session.user.role}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
            <p className="mt-1 font-medium">Akun aktif</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kontrol Akses</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Owner memiliki akses penuh untuk menghapus data dan mengelola konfigurasi sistem.
            Admin hanya dapat menambah dan mengedit data, tanpa akses hapus.
          </p>
          <p>
            Untuk menambah pengguna baru, gunakan endpoint seeding atau hubungi administrator sistem.
          </p>
        </CardContent>
      </Card>

      <ThermalPrinterSettings />
    </div>
  )
}
