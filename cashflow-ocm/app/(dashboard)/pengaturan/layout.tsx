export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

/**
 * W4 (audit 2026-06-22): /pengaturan = OWNER-ONLY untuk SELURUH subtree.
 * Sebelumnya hanya /pengaturan/pengguna yang ber-guard; subhalaman lain
 * (pajak/perusahaan/cadangan/dst) bisa DIBACA non-owner via ketik URL langsung
 * (proxy hanya cek cookie, bukan role). Guard di layout menutup read-exposure
 * sekaligus untuk semua subhalaman tanpa menambal satu-satu. Tulis pengaturan
 * sudah owner-only di server actions; ini menyamakan akses-baca halamannya.
 */
export default async function PengaturanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  if ((session.user as { role?: string }).role !== 'owner') redirect('/dashboard')

  return <>{children}</>
}
