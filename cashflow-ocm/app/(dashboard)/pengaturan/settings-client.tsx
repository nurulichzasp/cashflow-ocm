'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Building2,
  Users,
  Palette,
  Trash2,
  KeyRound,
  Download,
  AlertTriangle,
  FileSpreadsheet,
  Settings2,
  Eye,
  EyeOff,
  UserPlus,
  RefreshCw,
  Wallet2,
  SlidersHorizontal,
  AtSign,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  addUser,
  deleteUser,
  updateUserRole,
  updateUserEmail,
  resetUserPassword,
  updateUserPermissions,
  setAppSettings,
} from './actions'
import { useRouter } from 'next/navigation'
import { ThermalPrinterSettings } from './thermal-printer-settings'
import { ThemeSelector } from '@/components/theme-selector'
import { Switch } from '@/components/ui/switch'
import { FieldError, invalidFieldClass } from '@/components/ui/field-error'

type SettingsSection = 'company' | 'users' | 'pajak' | 'printer' | 'theme' | 'backup'

interface UserItem {
  id: string
  name: string
  email: string
  role: string
  image: string | null
  permissions?: string | null
}

type ModulePerms = {
  pembelian: boolean
  penjualan: boolean
  kas: boolean
  biaya: boolean
  delete: boolean
}

const DEFAULT_PERMS: ModulePerms = {
  pembelian: true,
  penjualan: true,
  kas: true,
  biaya: true,
  delete: false,
}

/** Parse kolom permissions (JSON string) jadi objek, fallback default bila kosong/rusak. */
function parseUserPerms(raw?: string | null): ModulePerms {
  if (!raw) return { ...DEFAULT_PERMS }
  try {
    return { ...DEFAULT_PERMS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PERMS }
  }
}

interface SettingsClientProps {
  currentUser: {
    id: string
    role: string
  }
  initialUsers: UserItem[]
  /** Bila diisi, hanya render satu section ini (mode halaman terpisah, tanpa nav). */
  section?: SettingsSection
  /** Nilai awal Profil Perusahaan dari server (null = belum pernah disimpan ke server). */
  initialCompany?: {
    name: string | null
    address: string | null
    phone: string | null
    email: string | null
    npwp: string | null
    threshold: string | null
  }
  /** Nilai awal Pajak & Modal Awal dari server (null = belum pernah disimpan ke server). */
  initialTax?: {
    tarifPpn: string | null
    tarifPphBadan: string | null
    nominalPph25: string | null
    modalAwal: string | null
  }
}

export function SettingsClient({ currentUser, initialUsers, section, initialCompany, initialTax }: SettingsClientProps) {
  const router = useRouter()
  const isOwner = currentUser.role === 'owner'

  // Tab state (dipakai hanya saat mode standalone tanpa `section`)
  const [activeTab, setActiveTab] = useState<SettingsSection>('company')
  const active: SettingsSection = section ?? activeTab

  // Company profile state — nilai awal dari server (anti-flash); fallback default.
  const [companyName, setCompanyName] = useState(initialCompany?.name ?? 'CV OCM')
  const [address, setAddress] = useState(initialCompany?.address ?? 'Jl. Lintas Timur No. 45, Indragiri Hulu, Riau')
  const [phone, setPhone] = useState(initialCompany?.phone ?? '+62 812-3456-7890')
  const [email, setEmail] = useState(initialCompany?.email ?? 'admin@ocm.com')
  const [npwp, setNpwp] = useState(initialCompany?.npwp ?? '91.234.567.8-123.000')
  const [threshold, setThreshold] = useState(initialCompany?.threshold ?? '50000000') // Rp 50.000.000

  // Tax config state — nilai awal dari server (anti-flash); fallback default.
  const [tarifPpn, setTarifPpn] = useState(initialTax?.tarifPpn ?? '11')
  const [tarifPphBadan, setTarifPphBadan] = useState(initialTax?.tarifPphBadan ?? '22')
  const [nominalPph25, setNominalPph25] = useState(initialTax?.nominalPph25 ?? '698917')
  const [modalAwal, setModalAwal] = useState(initialTax?.modalAwal ?? '0')

  useEffect(() => {
    // Sumber kebenaran = server (lewat initialCompany/initialTax, sudah ter-render
    // server-side → tanpa flash). MASA TRANSISI: hanya untuk field yang server-nya
    // MASIH kosong (belum pernah disimpan ke server), pakai nilai lama dari
    // localStorage agar tak hilang. Sekali user menyimpan, semua pindah ke server.
    const ls = (k: string) => localStorage.getItem(k)
    if (!initialCompany?.name) { const v = ls('company_name'); if (v) setCompanyName(v) }
    if (!initialCompany?.address) { const v = ls('company_address'); if (v) setAddress(v) }
    if (!initialCompany?.phone) { const v = ls('company_phone'); if (v) setPhone(v) }
    if (!initialCompany?.email) { const v = ls('company_email'); if (v) setEmail(v) }
    if (!initialCompany?.npwp) { const v = ls('company_npwp'); if (v) setNpwp(v) }
    if (!initialCompany?.threshold) { const v = ls('company_large_transaction_threshold'); if (v) setThreshold(v) }
    if (!initialTax?.tarifPpn) { const v = ls('tax_tarif_ppn'); if (v) setTarifPpn(v) }
    if (!initialTax?.tarifPphBadan) { const v = ls('tax_tarif_pph_badan'); if (v) setTarifPphBadan(v) }
    if (!initialTax?.nominalPph25) { const v = ls('tax_nominal_pph25'); if (v) setNominalPph25(v) }
    if (!initialTax?.modalAwal) { const v = ls('neraca_modal_awal'); if (v) setModalAwal(v) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault()
    try {
      // Sumber kebenaran: server (sinkron lintas perangkat).
      await setAppSettings({
        company_name: companyName,
        company_address: address,
        company_phone: phone,
        company_email: email,
        company_npwp: npwp,
        company_large_transaction_threshold: threshold,
      })
      // localStorage tetap diisi sebagai cadangan tak berbahaya (offline-friendly).
      localStorage.setItem('company_name', companyName)
      localStorage.setItem('company_address', address)
      localStorage.setItem('company_phone', phone)
      localStorage.setItem('company_email', email)
      localStorage.setItem('company_npwp', npwp)
      localStorage.setItem('company_large_transaction_threshold', threshold)
      toast.success('Profil perusahaan berhasil disimpan')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan. Coba lagi.')
    }
  }

  // Add user state
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<string>('admin')
  const [customRoleVal, setCustomRoleVal] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submittingUser, setSubmittingUser] = useState(false)
  const [userErrors, setUserErrors] = useState<{ name?: string; email?: string; password?: string; role?: string }>({})
  const [taxErrors, setTaxErrors] = useState<{ ppn?: string; pph?: string; pph25?: string; modal?: string }>({})

  // Permissions state
  const [accessPembelian, setAccessPembelian] = useState(true)
  const [accessPenjualan, setAccessPenjualan] = useState(true)
  const [accessKas, setAccessKas] = useState(true)
  const [accessBiaya, setAccessBiaya] = useState(true)
  const [accessDelete, setAccessDelete] = useState(false)

  // Auto check/uncheck permissions depending on role selection
  useEffect(() => {
    if (newUserRole === 'owner') {
      setAccessPembelian(true)
      setAccessPenjualan(true)
      setAccessKas(true)
      setAccessBiaya(true)
      setAccessDelete(true)
    } else if (newUserRole === 'admin') {
      setAccessPembelian(true)
      setAccessPenjualan(true)
      setAccessKas(true)
      setAccessBiaya(true)
      setAccessDelete(false)
    }
  }, [newUserRole])

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    const finalRole = newUserRole === 'other' ? customRoleVal.trim() : newUserRole
    // Validasi inline per-field — pesan muncul di bawah tiap kotak (bukan toast).
    const errs: { name?: string; email?: string; password?: string; role?: string } = {}
    if (!newUserName.trim()) errs.name = 'Nama wajib diisi'
    if (!newUserEmail.trim()) errs.email = 'Email wajib diisi'
    else if (!/^\S+@\S+\.\S+$/.test(newUserEmail.trim())) errs.email = 'Format email tidak valid'
    if (!newUserPassword) errs.password = 'Kata sandi wajib diisi'
    else if (newUserPassword.length < 8) errs.password = 'Kata sandi minimal 8 karakter'
    if (!finalRole) errs.role = 'Peran sistem wajib diisi'
    setUserErrors(errs)
    if (Object.keys(errs).length > 0) return

    const permissionsJSON = JSON.stringify({
      pembelian: accessPembelian,
      penjualan: accessPenjualan,
      kas: accessKas,
      biaya: accessBiaya,
      delete: accessDelete,
    })

    setSubmittingUser(true)
    try {
      await addUser({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: finalRole,
        permissions: permissionsJSON,
      })
      toast.success('Pengguna baru berhasil ditambahkan')
      setAddUserOpen(false)
      // Reset form
      setUserErrors({})
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPassword('')
      setNewUserRole('admin')
      setCustomRoleVal('')
      setAccessPembelian(true)
      setAccessPenjualan(true)
      setAccessKas(true)
      setAccessBiaya(true)
      setAccessDelete(false)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan pengguna'
      toast.error(msg)
    } finally {
      setSubmittingUser(false)
    }
  }

  // Ganti email login state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailTarget, setEmailTarget] = useState<UserItem | null>(null)
  const [newEmailVal, setNewEmailVal] = useState('')
  const [submittingEmail, setSubmittingEmail] = useState(false)

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!emailTarget || !newEmailVal.trim()) return

    setSubmittingEmail(true)
    try {
      await updateUserEmail(emailTarget.id, newEmailVal)
      toast.success(`Email login ${emailTarget.name} berhasil diubah`)
      setEmailDialogOpen(false)
      setNewEmailVal('')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah email login'
      toast.error(msg)
    } finally {
      setSubmittingEmail(false)
    }
  }

  // Reset password state
  const [resetPassOpen, setResetPassOpen] = useState(false)
  const [resetUserTarget, setResetUserTarget] = useState<UserItem | null>(null)
  const [newPassVal, setNewPassVal] = useState('')
  const [resettingPass, setResettingPass] = useState(false)

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!resetUserTarget || !newPassVal.trim()) return

    setResettingPass(true)
    try {
      await resetUserPassword(resetUserTarget.id, newPassVal)
      toast.success(`Sandi untuk ${resetUserTarget.name} berhasil direset`)
      setResetPassOpen(false)
      setNewPassVal('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mereset sandi'
      toast.error(msg)
    } finally {
      setResettingPass(false)
    }
  }

  // Edit access (permissions per modul) state
  const [editAccessOpen, setEditAccessOpen] = useState(false)
  const [editAccessTarget, setEditAccessTarget] = useState<UserItem | null>(null)
  const [editPerms, setEditPerms] = useState<ModulePerms>(DEFAULT_PERMS)
  const [savingAccess, setSavingAccess] = useState(false)

  function openEditAccess(target: UserItem) {
    setEditAccessTarget(target)
    setEditPerms(parseUserPerms(target.permissions))
    setEditAccessOpen(true)
  }

  async function handleSaveAccess(e: React.FormEvent) {
    e.preventDefault()
    if (!editAccessTarget) return

    setSavingAccess(true)
    try {
      await updateUserPermissions(editAccessTarget.id, JSON.stringify(editPerms))
      toast.success(`Hak akses ${editAccessTarget.name} berhasil diperbarui`)
      setEditAccessOpen(false)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui hak akses'
      toast.error(msg)
    } finally {
      setSavingAccess(false)
    }
  }

  // Delete user state
  async function handleDeleteUser(id: string, name: string) {
    try {
      await deleteUser(id)
      toast.success(`Pengguna ${name} berhasil dihapus`)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus pengguna'
      toast.error(msg)
    }
  }

  // Change user role state
  async function handleChangeRole(id: string, currentRole: string) {
    const nextRole = currentRole === 'owner' ? 'admin' : 'owner'
    try {
      await updateUserRole(id, nextRole)
      toast.success(`Peran berhasil diubah menjadi ${nextRole === 'owner' ? 'Owner' : 'Admin'}`)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah peran'
      toast.error(msg)
    }
  }

  // Export JSON backup
  function handleExportBackup() {
    // Generate simple metadata dump
    const backupData = {
      app: 'CV OCM Cashflow Manager',
      backupDate: new Date().toISOString(),
      company: { companyName, address, phone, email, npwp, threshold },
      usersCount: initialUsers.length,
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `backup-config-${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    toast.success('Cadangan konfigurasi berhasil diunduh')
  }

  return (
    <div className={section ? '' : 'flex flex-col md:flex-row gap-5'}>
      {/* Settings Navigation Menu — hanya saat mode standalone (tanpa section) */}
      {!section && (
      <div className="w-full md:w-64 shrink-0 space-y-1">
        <button
          onClick={() => setActiveTab('company')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left outline-none cursor-pointer ${
            activeTab === 'company'
              ? 'bg-stone-100 dark:bg-white/[0.06] text-stone-900 dark:text-zinc-100'
              : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900/60'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Profil Perusahaan
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left outline-none cursor-pointer ${
            activeTab === 'users'
              ? 'bg-stone-100 dark:bg-white/[0.06] text-stone-900 dark:text-zinc-100'
              : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900/60'
          }`}
        >
          <Users className="h-4 w-4" />
          Manajemen Pengguna
        </button>

        <button
          onClick={() => setActiveTab('pajak')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left outline-none cursor-pointer ${
            activeTab === 'pajak'
              ? 'bg-stone-100 dark:bg-white/[0.06] text-stone-900 dark:text-zinc-100'
              : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900/60'
          }`}
        >
          <Wallet2 className="h-4 w-4" />
          Pajak &amp; Neraca
        </button>

        <button
          onClick={() => setActiveTab('printer')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left outline-none cursor-pointer ${
            activeTab === 'printer'
              ? 'bg-stone-100 dark:bg-white/[0.06] text-stone-900 dark:text-zinc-100'
              : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900/60'
          }`}
        >
          <Settings2 className="h-4 w-4" />
          Printer Kasir
        </button>

        <button
          onClick={() => setActiveTab('theme')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left outline-none cursor-pointer ${
            activeTab === 'theme'
              ? 'bg-stone-100 dark:bg-white/[0.06] text-stone-900 dark:text-zinc-100'
              : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900/60'
          }`}
        >
          <Palette className="h-4 w-4" />
          Tampilan &amp; Tema
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left outline-none cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-stone-100 dark:bg-white/[0.06] text-stone-900 dark:text-zinc-100'
              : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900/60'
          }`}
        >
          <Download className="h-4 w-4" />
          Pencadangan Data
        </button>
      </div>
      )}

      {/* Main Settings Card Content */}
      <div className={section ? '' : 'flex-1 min-w-0'}>
        {active === 'company' && (
          <Card className="dark:bg-card">
            {!section && (
            <CardHeader>
              <CardTitle className="text-lg font-bold tracking-tight">Profil Perusahaan</CardTitle>
              <CardDescription>Atur data legalitas dan konfigurasi operasional sawit CV OCM.</CardDescription>
            </CardHeader>
            )}
            <CardContent>
              <form onSubmit={handleSaveCompany} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName">Nama Perusahaan</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="npwp">NPWP Perusahaan</Label>
                    <Input
                      id="npwp"
                      value={npwp}
                      onChange={(e) => setNpwp(e.target.value)}
                      placeholder="Contoh: 91.234.567.8-123.000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telepon / WhatsApp</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Kantor</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address">Alamat Perusahaan</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <hr className="border-stone-100 dark:border-stone-800 my-4" />

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 text-stone-900 dark:text-stone-100">
                    <Wallet2 className="h-4 w-4 text-stone-700 dark:text-zinc-300" />
                    Kebijakan Transaksi
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="threshold">Batas Transaksi Kas Besar (Rp)</Label>
                      <Input
                        id="threshold"
                        type="number"
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        placeholder="Contoh: 50000000"
                      />
                      <p className="text-[11px] text-muted-foreground">Transaksi keluar melebihi nominal ini butuh konfirmasi Owner.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <Button type="submit" disabled={!isOwner} className="cursor-pointer cursor-pointer">
                    Simpan Profil Perusahaan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {active === 'users' && (
          <Card className="dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              {!section && (
              <div>
                <CardTitle className="text-lg font-bold tracking-tight">Manajemen Pengguna</CardTitle>
                <CardDescription>Kelola pengguna dengan akses sistem keuangan sawit.</CardDescription>
              </div>
              )}
              {isOwner && (
                <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="ml-auto cursor-pointer cursor-pointer gap-1.5">
                      <UserPlus className="h-4 w-4" /> Tambah Pengguna
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[400px] dark:bg-card">
                    <DialogHeader>
                      <DialogTitle className="font-bold">Tambah Pengguna Baru</DialogTitle>
                      <DialogDescription>Masukkan detail login pengguna baru. Simpan sandi dengan aman.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddUser} noValidate className="space-y-4 py-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="newUserName">Nama Lengkap</Label>
                        <Input
                          id="newUserName"
                          value={newUserName}
                          onChange={(e) => { setNewUserName(e.target.value); if (userErrors.name) setUserErrors((p) => ({ ...p, name: undefined })) }}
                          placeholder="Contoh: Sastro"
                          aria-invalid={!!userErrors.name}
                          className={userErrors.name ? invalidFieldClass : undefined}
                          required
                        />
                        <FieldError>{userErrors.name}</FieldError>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="newUserEmail">Email Login</Label>
                        <Input
                          id="newUserEmail"
                          type="email"
                          value={newUserEmail}
                          onChange={(e) => { setNewUserEmail(e.target.value); if (userErrors.email) setUserErrors((p) => ({ ...p, email: undefined })) }}
                          placeholder="admin@ocm.com"
                          aria-invalid={!!userErrors.email}
                          className={userErrors.email ? invalidFieldClass : undefined}
                          required
                        />
                        <FieldError>{userErrors.email}</FieldError>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="newUserPassword">Kata Sandi</Label>
                        <div className="relative">
                          <Input
                            id="newUserPassword"
                            type={showPassword ? 'text' : 'password'}
                            value={newUserPassword}
                            onChange={(e) => { setNewUserPassword(e.target.value); if (userErrors.password) setUserErrors((p) => ({ ...p, password: undefined })) }}
                            placeholder="Minimal 8 karakter"
                            aria-invalid={!!userErrors.password}
                            className={userErrors.password ? invalidFieldClass : undefined}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-stone-400 hover:text-stone-600"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <FieldError>{userErrors.password}</FieldError>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="newUserRole">Peran Sistem</Label>
                        <Select
                          value={newUserRole}
                          onValueChange={(val: string) => setNewUserRole(val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Peran" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin (Kasir/Petugas Timbangan)</SelectItem>
                            <SelectItem value="owner">Owner (Akses Penuh)</SelectItem>
                            <SelectItem value="other">Lainnya (Isi Manual)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {newUserRole === 'other' && (
                        <div className="space-y-1.5">
                          <Label htmlFor="customRoleVal">Masukkan Peran Kustom</Label>
                          <Input
                            id="customRoleVal"
                            value={customRoleVal}
                            onChange={(e) => { setCustomRoleVal(e.target.value); if (userErrors.role) setUserErrors((p) => ({ ...p, role: undefined })) }}
                            placeholder="Contoh: Keuangan, Operator"
                            aria-invalid={!!userErrors.role}
                            className={userErrors.role ? invalidFieldClass : undefined}
                            required
                          />
                          <FieldError>{userErrors.role}</FieldError>
                        </div>
                      )}

                      <div className="space-y-2 border-t border-stone-100 dark:border-stone-800 pt-3 mt-3">
                        <Label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                          Pilihan Hak Akses
                        </Label>
                        <div className="space-y-2 mt-1.5">
                          {([
                            { key: 'pembelian', label: 'Modul Pembelian', desc: 'Tiket sawit & timbangan', checked: accessPembelian, set: setAccessPembelian },
                            { key: 'penjualan', label: 'Modul Penjualan', desc: 'Invoice BGA', checked: accessPenjualan, set: setAccessPenjualan },
                            { key: 'kas', label: 'Buku Kas', desc: 'Mutasi rekening', checked: accessKas, set: setAccessKas },
                            { key: 'biaya', label: 'Biaya Operasional', desc: 'Pengeluaran harian', checked: accessBiaya, set: setAccessBiaya },
                          ] as const).map((row) => (
                            <div
                              key={row.key}
                              className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-white/[0.02] px-3.5 py-2.5"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{row.label}</p>
                                <p className="text-[11px] text-stone-400 dark:text-stone-500">{row.desc}</p>
                              </div>
                              <Switch checked={row.checked} onCheckedChange={row.set} aria-label={`Akses ${row.label}`} />
                            </div>
                          ))}

                          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-950/60 bg-red-50/40 dark:bg-red-950/10 px-3.5 py-2.5">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-crit">Hapus Transaksi</p>
                              <p className="text-[11px] text-crit opacity-75">Izin menghapus data permanen</p>
                            </div>
                            <Switch checked={accessDelete} onCheckedChange={setAccessDelete} aria-label="Akses Hapus Transaksi" />
                          </div>
                        </div>
                      </div>

                      <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => { setAddUserOpen(false); setUserErrors({}) }} className="border-stone-200">
                          Batal
                        </Button>
                        <Button type="submit" disabled={submittingUser} className="cursor-pointer">
                          {submittingUser ? 'Menyimpan...' : 'Tambahkan'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <Table>
                  <TableHeader className="bg-stone-50 dark:bg-stone-900/60">
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-24 text-center">Peran</TableHead>
                      <TableHead className="w-32 text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {initialUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-stone-50/30 dark:hover:bg-white/[0.02] dark:hover:bg-white/[0.02]">
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-stone-500">{user.email}</TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                            user.role === 'owner'
                              ? 'bg-[var(--warn-bg)] text-[var(--warn-fg)] border border-[var(--warn-fg)]/20'
                              : user.role === 'admin'
                              ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                          }`}>
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {isOwner ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Ganti Email Login — tersedia untuk SEMUA pengguna termasuk diri sendiri */}
                              <Dialog
                                open={emailDialogOpen && emailTarget?.id === user.id}
                                onOpenChange={(op) => {
                                  setEmailDialogOpen(op)
                                  if (op) {
                                    setEmailTarget(user)
                                    setNewEmailVal(user.email)
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                                    title="Ganti Email Login"
                                  >
                                    <AtSign className="h-3.5 w-3.5" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[400px] dark:bg-card">
                                  <DialogHeader>
                                    <DialogTitle className="font-bold">Ganti Email Login</DialogTitle>
                                    <DialogDescription>
                                      Ubah email yang dipakai <strong>{user.name}</strong> untuk masuk.
                                      {user.id === currentUser.id && ' Anda tetap login; gunakan email baru saat masuk berikutnya.'}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <form onSubmit={handleChangeEmail} className="space-y-4 py-2">
                                    <div className="space-y-1.5">
                                      <Label htmlFor="newEmailVal">Email Login Baru</Label>
                                      <Input
                                        id="newEmailVal"
                                        type="email"
                                        value={newEmailVal}
                                        onChange={(e) => setNewEmailVal(e.target.value)}
                                        placeholder="nama@omandacerli.com"
                                        required
                                      />
                                    </div>
                                    <DialogFooter className="pt-2">
                                      <Button type="button" variant="outline" onClick={() => setEmailDialogOpen(false)} className="border-stone-200">
                                        Batal
                                      </Button>
                                      <Button type="submit" disabled={submittingEmail} className="cursor-pointer">
                                        {submittingEmail ? 'Memproses...' : 'Ubah Email'}
                                      </Button>
                                    </DialogFooter>
                                  </form>
                                </DialogContent>
                              </Dialog>

                              {/* Aksi berikut hanya untuk pengguna LAIN (bukan diri sendiri) */}
                              {user.id !== currentUser.id && (
                              <>
                              {/* Edit Akses (hak akses per modul) */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                                onClick={() => openEditAccess(user)}
                                title="Atur Hak Akses"
                              >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                              </Button>

                              {/* Change Role */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                                onClick={() => handleChangeRole(user.id, user.role)}
                                title="Ubah Peran"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>

                              {/* Reset password */}
                              <Dialog
                                open={resetPassOpen && resetUserTarget?.id === user.id}
                                onOpenChange={(op) => {
                                  setResetPassOpen(op)
                                  if (op) setResetUserTarget(user)
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                                    title="Reset Sandi"
                                  >
                                    <KeyRound className="h-3.5 w-3.5" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[400px] dark:bg-card">
                                  <DialogHeader>
                                    <DialogTitle className="font-bold">Reset Kata Sandi</DialogTitle>
                                    <DialogDescription>Ubah kata sandi login untuk <strong>{user.name}</strong>.</DialogDescription>
                                  </DialogHeader>
                                  <form onSubmit={handleResetPassword} className="space-y-4 py-2">
                                    <div className="space-y-1.5">
                                      <Label htmlFor="newPassVal">Kata Sandi Baru</Label>
                                      <Input
                                        id="newPassVal"
                                        type="password"
                                        value={newPassVal}
                                        onChange={(e) => setNewPassVal(e.target.value)}
                                        placeholder="Min 6 karakter"
                                        required
                                      />
                                    </div>
                                    <DialogFooter className="pt-2">
                                      <Button type="button" variant="outline" onClick={() => setResetPassOpen(false)} className="border-stone-200">
                                        Batal
                                      </Button>
                                      <Button type="submit" disabled={resettingPass} className="cursor-pointer">
                                        {resettingPass ? 'Memproses...' : 'Ubah Sandi'}
                                      </Button>
                                    </DialogFooter>
                                  </form>
                                </DialogContent>
                              </Dialog>

                              {/* Delete user */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                    title="Hapus Pengguna"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Hapus Pengguna?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Akun <strong>{user.name}</strong> ({user.email}) akan dihapus secara permanen dari sistem keuangan.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      variant="destructive"
                                      onClick={() => handleDeleteUser(user.id, user.name)}
                                    >
                                      Hapus
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              </>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Dialog Atur Hak Akses — edit permissions modul untuk user terpilih */}
              <Dialog open={editAccessOpen} onOpenChange={setEditAccessOpen}>
                <DialogContent className="sm:max-w-[420px] dark:bg-card">
                  <DialogHeader>
                    <DialogTitle className="font-bold">Atur Hak Akses</DialogTitle>
                    <DialogDescription>
                      Tentukan modul yang bisa diakses oleh{' '}
                      <strong>{editAccessTarget?.name}</strong>.
                      {editAccessTarget?.role === 'owner' && (
                        <span className="mt-1 block text-warn">
                          Catatan: Owner selalu punya akses penuh, terlepas dari pengaturan ini.
                        </span>
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSaveAccess} className="space-y-4 py-2">
                    <div className="space-y-2">
                      {([
                        { key: 'pembelian', label: 'Modul Pembelian', desc: 'Tiket sawit & timbangan' },
                        { key: 'penjualan', label: 'Modul Penjualan', desc: 'Invoice BGA' },
                        { key: 'kas', label: 'Buku Kas', desc: 'Mutasi rekening' },
                        { key: 'biaya', label: 'Biaya Operasional', desc: 'Pengeluaran harian' },
                      ] as const).map((row) => (
                        <div
                          key={row.key}
                          className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-white/[0.02] px-3.5 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{row.label}</p>
                            <p className="text-[11px] text-stone-400 dark:text-stone-500">{row.desc}</p>
                          </div>
                          <Switch
                            checked={editPerms[row.key]}
                            onCheckedChange={(v) => setEditPerms((p) => ({ ...p, [row.key]: v }))}
                            aria-label={`Akses ${row.label}`}
                          />
                        </div>
                      ))}

                      <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-950/60 bg-red-50/40 dark:bg-red-950/10 px-3.5 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-crit">Hapus Transaksi</p>
                          <p className="text-[11px] text-crit opacity-75">Izin menghapus data permanen</p>
                        </div>
                        <Switch
                          checked={editPerms.delete}
                          onCheckedChange={(v) => setEditPerms((p) => ({ ...p, delete: v }))}
                          aria-label="Akses Hapus Transaksi"
                        />
                      </div>
                    </div>

                    <DialogFooter className="pt-2">
                      <Button type="button" variant="outline" onClick={() => setEditAccessOpen(false)} className="border-stone-200">
                        Batal
                      </Button>
                      <Button type="submit" disabled={savingAccess} className="cursor-pointer">
                        {savingAccess ? 'Menyimpan...' : 'Simpan Akses'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        {active === 'pajak' && (
          <Card className="dark:bg-card">
            {!section && (
            <CardHeader>
              <CardTitle className="text-lg font-bold tracking-tight">Konfigurasi Pajak &amp; Neraca</CardTitle>
              <CardDescription>Atur tarif pajak dan modal awal untuk laporan keuangan.</CardDescription>
            </CardHeader>
            )}
            <CardContent>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  // Validasi inline per-field — tarif 0–100%, nominal ≥ 0, harus angka.
                  const num = (v: string) => (v.trim() === '' || isNaN(Number(v)) ? null : Number(v))
                  const te: { ppn?: string; pph?: string; pph25?: string; modal?: string } = {}
                  const nPpn = num(tarifPpn); if (nPpn === null || nPpn < 0 || nPpn > 100) te.ppn = 'Isi tarif 0–100%'
                  const nPph = num(tarifPphBadan); if (nPph === null || nPph < 0 || nPph > 100) te.pph = 'Isi tarif 0–100%'
                  const nP25 = num(nominalPph25); if (nP25 === null || nP25 < 0) te.pph25 = 'Isi angka ≥ 0'
                  const nMod = num(modalAwal); if (nMod === null || nMod < 0) te.modal = 'Isi angka ≥ 0'
                  setTaxErrors(te)
                  if (Object.keys(te).length > 0) return
                  try {
                    // Sumber kebenaran: server (tarif pajak + modal awal sinkron lintas perangkat).
                    await setAppSettings({
                      tax_tarif_ppn: tarifPpn,
                      tax_tarif_pph_badan: tarifPphBadan,
                      tax_nominal_pph25: nominalPph25,
                      neraca_modal_awal: modalAwal,
                    })
                    // localStorage tetap diisi sebagai cadangan tak berbahaya.
                    localStorage.setItem('tax_tarif_ppn', tarifPpn)
                    localStorage.setItem('tax_tarif_pph_badan', tarifPphBadan)
                    localStorage.setItem('tax_nominal_pph25', nominalPph25)
                    localStorage.setItem('neraca_modal_awal', modalAwal)
                    toast.success('Konfigurasi pajak berhasil disimpan')
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Gagal menyimpan. Coba lagi.')
                  }
                }}
                noValidate
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="tarifPpn">Tarif PPN (%)</Label>
                    <Input id="tarifPpn" type="number" step="0.1" value={tarifPpn} onChange={(e) => { setTarifPpn(e.target.value); if (taxErrors.ppn) setTaxErrors((p) => ({ ...p, ppn: undefined })) }} aria-invalid={!!taxErrors.ppn} className={taxErrors.ppn ? invalidFieldClass : undefined} />
                    <FieldError>{taxErrors.ppn}</FieldError>
                    <p className="text-[11px] text-muted-foreground">Saat ini 11%. Berlaku untuk setiap penjualan ke BGA.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tarifPph">Tarif PPh Badan (%)</Label>
                    <Input id="tarifPph" type="number" step="0.1" value={tarifPphBadan} onChange={(e) => { setTarifPphBadan(e.target.value); if (taxErrors.pph) setTaxErrors((p) => ({ ...p, pph: undefined })) }} aria-invalid={!!taxErrors.pph} className={taxErrors.pph ? invalidFieldClass : undefined} />
                    <FieldError>{taxErrors.pph}</FieldError>
                    <p className="text-[11px] text-muted-foreground">22% dari laba kena pajak (tahunan).</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nominalPph25">PPh Pasal 25 / bulan (Rp)</Label>
                    <Input id="nominalPph25" type="number" value={nominalPph25} onChange={(e) => { setNominalPph25(e.target.value); if (taxErrors.pph25) setTaxErrors((p) => ({ ...p, pph25: undefined })) }} aria-invalid={!!taxErrors.pph25} className={taxErrors.pph25 ? invalidFieldClass : undefined} />
                    <FieldError>{taxErrors.pph25}</FieldError>
                    <p className="text-[11px] text-muted-foreground">Cicilan bulanan. Dibayar paling lambat tgl 15 bulan berikutnya.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="modalAwal">Modal Awal Neraca (Rp)</Label>
                    <Input id="modalAwal" type="number" value={modalAwal} onChange={(e) => { setModalAwal(e.target.value); if (taxErrors.modal) setTaxErrors((p) => ({ ...p, modal: undefined })) }} aria-invalid={!!taxErrors.modal} className={taxErrors.modal ? invalidFieldClass : undefined} />
                    <FieldError>{taxErrors.modal}</FieldError>
                    <p className="text-[11px] text-muted-foreground">Modal awal pemilik untuk laporan neraca.</p>
                  </div>
                </div>
                <div className="pt-3">
                  <Button type="submit" disabled={!isOwner} className="cursor-pointer cursor-pointer">
                    Simpan Konfigurasi Pajak
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {active === 'printer' && (
          <ThermalPrinterSettings />
        )}

        {active === 'theme' && (
          <Card className="dark:bg-card">
            {!section && (
            <CardHeader>
              <CardTitle className="text-lg font-bold tracking-tight">Tampilan &amp; Tema</CardTitle>
              <CardDescription>Pilih tema tampilan aplikasi yang paling nyaman untuk Anda.</CardDescription>
            </CardHeader>
            )}
            <CardContent className="space-y-3">
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Mode otomatis mengikuti pengaturan tema perangkat komputer atau HP kamu.
              </p>
              <ThemeSelector />
            </CardContent>
          </Card>
        )}

        {active === 'backup' && (
          <Card className="dark:bg-card">
            {!section && (
            <CardHeader>
              <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-1.5">
                <Download className="h-5 w-5 text-stone-700 dark:text-zinc-300" />
                Ekspor &amp; Pemulihan Data
              </CardTitle>
              <CardDescription>Cadangkan seluruh database konfigurasi atau bersihkan sistem keuangan.</CardDescription>
            </CardHeader>
            )}
            <CardContent className="space-y-6">
              {/* Export backup section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-stone-700 dark:text-zinc-300" /> Ekspor Konfigurasi
                </h3>
                <p className="text-xs text-muted-foreground max-w-xl">
                  Unduh cadangan data konfigurasi instansi perusahaan Anda (berisi nama kantor, npwp, dan detail profile) sebagai berkas JSON untuk kebutuhan backup berkala.
                </p>
                <Button
                  onClick={handleExportBackup}
                  variant="outline"
                  className="gap-2 border-stone-200 text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 cursor-pointer"
                >
                  <Download className="h-4 w-4" /> Unduh Cadangan JSON
                </Button>
              </div>

              <hr className="border-stone-100 dark:border-stone-800" />

              {/* Danger Zone */}
              {isOwner && (
                <div className="rounded-xl border border-red-200 dark:border-red-950 bg-red-50/20 dark:bg-red-950/5 p-4 space-y-3">
                  <h3 className="text-sm font-bold text-crit flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Zona Berbahaya
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 max-w-xl leading-relaxed">
                    Menghapus data akan memusnahkan seluruh riwayat kas, pembelian tiket sawit, penjualan BGA, dan biaya operasional. Tindakan ini tidak dapat dibatalkan. Hanya direkomendasikan saat memulai pembukuan tahun fiskal baru.
                  </p>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" /> Bersihkan Seluruh Data Transaksi
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-crit">Yakin ingin menghapus seluruh data?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>Tindakan ini akan mengosongkan:</p>
                          <ul className="list-disc list-inside text-xs font-semibold text-foreground">
                            <li>Semua tiket Pembelian sawit</li>
                            <li>Semua riwayat Penjualan</li>
                            <li>Semua Biaya Operasional</li>
                            <li>Semua mutasi di Buku Kas</li>
                          </ul>
                          <p>Data Peron, Rekening Kas, dan Akun Pengguna akan tetap aman.</p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/health?clear=1', { method: 'POST' })
                              if (res.ok) {
                                toast.success('Database transaksi berhasil dibersihkan')
                                router.push('/dashboard')
                                router.refresh()
                              } else {
                                throw new Error('Gagal membersihkan database')
                              }
                            } catch (err) {
                              toast.error('Gagal membersihkan data: ' + String(err))
                            }
                          }}
                        >
                          Ya, Bersihkan Data
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
