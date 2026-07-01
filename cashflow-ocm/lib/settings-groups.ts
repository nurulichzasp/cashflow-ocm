import {
  Building2,
  Wallet2,
  TrendingUp,
  ShieldAlert,
  Users,
  SunMoon,
  Bell,
  Printer,
  DatabaseBackup,
  Info,
  type LucideIcon,
} from 'lucide-react'

export type SettingsItem = {
  href: string
  icon: LucideIcon
  title: string
  desc: string
}

export type SettingsGroup = {
  label: string
  items: SettingsItem[]
}

/**
 * Daftar menu Pengaturan — sumber tunggal yang dipakai halaman /pengaturan DAN
 * halaman /profil (Opsi A: profil jadi pintu masuk, route /pengaturan/* tetap).
 */
export function getSettingsGroups(isOwner: boolean): SettingsGroup[] {
  return [
    {
      label: 'Bisnis',
      items: [
        { href: '/pengaturan/perusahaan', icon: Building2, title: 'Profil Perusahaan', desc: 'Nama, alamat, NPWP & ambang transaksi besar' },
        { href: '/pengaturan/pajak', icon: Wallet2, title: 'Pajak & Neraca', desc: 'Tarif PPN, PPh badan & modal awal' },
        { href: '/pengaturan/harga', icon: TrendingUp, title: 'Harga & Margin', desc: 'Selisih jual BGA terbaru per produk' },
        ...(isOwner
          ? [{ href: '/pengaturan/retensi', icon: ShieldAlert, title: 'Retensi & Pertahanan', desc: 'Ambang loyalitas & floor margin peron' }]
          : []),
      ],
    },
    ...(isOwner
      ? [{
          label: 'Pengguna & Akses',
          items: [
            { href: '/pengaturan/pengguna', icon: Users, title: 'Manajemen Pengguna', desc: 'Tambah pengguna & atur hak akses modul' },
          ],
        }]
      : []),
    {
      label: 'Aplikasi',
      items: [
        { href: '/pengaturan/tampilan', icon: SunMoon, title: 'Tampilan & Tema', desc: 'Mode terang, gelap, atau otomatis' },
        { href: '/pengaturan/notifikasi', icon: Bell, title: 'Notifikasi', desc: 'Status Telegram & laporan otomatis' },
        { href: '/pengaturan/printer', icon: Printer, title: 'Printer Kasir', desc: 'Pengaturan struk thermal 58mm' },
      ],
    },
    {
      label: 'Data & Bantuan',
      items: [
        { href: '/pengaturan/cadangan', icon: DatabaseBackup, title: 'Pencadangan Data', desc: 'Ekspor konfigurasi & zona berbahaya' },
        { href: '/pengaturan/tentang', icon: Info, title: 'Tentang Aplikasi', desc: 'Versi, teknologi & lisensi' },
      ],
    },
  ]
}
