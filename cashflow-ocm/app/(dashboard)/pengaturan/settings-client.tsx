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
  Shield,
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
} from 'lucide-react'
import { toast } from 'sonner'
import {
  addUser,
  deleteUser,
  updateUserRole,
  resetUserPassword,
} from './actions'
import { useRouter } from 'next/navigation'
import { ThermalPrinterSettings } from './thermal-printer-settings'
import { ThemeSelector } from '@/components/theme-selector'

interface UserItem {
  id: string
  name: string
  email: string
  role: string
  image: string | null
}

interface SettingsClientProps {
  currentUser: {
    id: string
    role: string
  }
  initialUsers: UserItem[]
}

export function SettingsClient({ currentUser, initialUsers }: SettingsClientProps) {
  const router = useRouter()
  const isOwner = currentUser.role === 'owner'

  // Tab state
  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'pajak' | 'printer' | 'theme' | 'backup'>('company')

  // Company profile state
  const [companyName, setCompanyName] = useState('CV OCM')
  const [address, setAddress] = useState('Jl. Lintas Timur No. 45, Indragiri Hulu, Riau')
  const [phone, setPhone] = useState('+62 812-3456-7890')
  const [email, setEmail] = useState('admin@ocm.com')
  const [npwp, setNpwp] = useState('91.234.567.8-123.000')
  const [threshold, setThreshold] = useState('50000000') // Rp 50.000.000

  // Tax config state
  const [tarifPpn, setTarifPpn] = useState('11')
  const [tarifPphBadan, setTarifPphBadan] = useState('22')
  const [nominalPph25, setNominalPph25] = useState('698917')
  const [modalAwal, setModalAwal] = useState('0')

  useEffect(() => {
    // Load from localStorage if exists
    const storedName = localStorage.getItem('company_name')
    const storedAddress = localStorage.getItem('company_address')
    const storedPhone = localStorage.getItem('company_phone')
    const storedEmail = localStorage.getItem('company_email')
    const storedNpwp = localStorage.getItem('company_npwp')
    const storedThreshold = localStorage.getItem('company_large_transaction_threshold')

    if (storedName) setCompanyName(storedName)
    if (storedAddress) setAddress(storedAddress)
    if (storedPhone) setPhone(storedPhone)
    if (storedEmail) setEmail(storedEmail)
    if (storedNpwp) setNpwp(storedNpwp)
    if (storedThreshold) setThreshold(storedThreshold)

    const storedTarifPpn = localStorage.getItem('tax_tarif_ppn')
    const storedTarifPph = localStorage.getItem('tax_tarif_pph_badan')
    const storedNominalPph25 = localStorage.getItem('tax_nominal_pph25')
    const storedModalAwal = localStorage.getItem('neraca_modal_awal')
    if (storedTarifPpn) setTarifPpn(storedTarifPpn)
    if (storedTarifPph) setTarifPphBadan(storedTarifPph)
    if (storedNominalPph25) setNominalPph25(storedNominalPph25)
    if (storedModalAwal) setModalAwal(storedModalAwal)
  }, [])

  function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault()
    localStorage.setItem('company_name', companyName)
    localStorage.setItem('company_address', address)
    localStorage.setItem('company_phone', phone)
    localStorage.setItem('company_email', email)
    localStorage.setItem('company_npwp', npwp)
    localStorage.setItem('company_large_transaction_threshold', threshold)
    toast.success('Profil perusahaan berhasil disimpan')
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
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      toast.error('Semua data wajib diisi')
      return
    }

    const finalRole = newUserRole === 'other' ? customRoleVal.trim() : newUserRole
    if (!finalRole) {
      toast.error('Peran sistem wajib diisi')
      return
    }

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
    <div className="flex flex-col md:flex-row gap-5">
      {/* Settings Navigation Menu */}
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
          <Shield className="h-4 w-4" />
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

      {/* Main Settings Card Content */}
      <div className="flex-1 min-w-0">
        {activeTab === 'company' && (
          <Card className="dark:bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold tracking-tight">Profil Perusahaan</CardTitle>
              <CardDescription>Atur data legalitas dan konfigurasi operasional sawit CV OCM.</CardDescription>
            </CardHeader>
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
                      <p className="text-[11px] text-muted-foreground">Transksi keluar melebihi nominal ini butuh konfirmasi Owner.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <Button type="submit" className="bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-stone-900 text-white cursor-pointer">
                    Simpan Profil Perusahaan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === 'users' && (
          <Card className="dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-lg font-bold tracking-tight">Manajemen Pengguna</CardTitle>
                <CardDescription>Kelola pengguna dengan akses sistem keuangan sawit.</CardDescription>
              </div>
              {isOwner && (
                <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-stone-900 text-white cursor-pointer gap-1.5">
                      <UserPlus className="h-4 w-4" /> Tambah Pengguna
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[400px] dark:bg-card">
                    <DialogHeader>
                      <DialogTitle className="font-bold">Tambah Pengguna Baru</DialogTitle>
                      <DialogDescription>Masukkan detail login pengguna baru. Simpan sandi dengan aman.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddUser} className="space-y-4 py-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="newUserName">Nama Lengkap</Label>
                        <Input
                          id="newUserName"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="Contoh: Sastro"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="newUserEmail">Email Login</Label>
                        <Input
                          id="newUserEmail"
                          type="email"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="admin@ocm.com"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="newUserPassword">Kata Sandi</Label>
                        <div className="relative">
                          <Input
                            id="newUserPassword"
                            type={showPassword ? 'text' : 'password'}
                            value={newUserPassword}
                            onChange={(e) => setNewUserPassword(e.target.value)}
                            placeholder="Minimal 6 karakter"
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
                            onChange={(e) => setCustomRoleVal(e.target.value)}
                            placeholder="Contoh: Keuangan, Operator"
                            required
                          />
                        </div>
                      )}

                      <div className="space-y-2 border-t border-stone-100 dark:border-stone-800 pt-3 mt-3">
                        <Label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                          Pilihan Hak Akses
                        </Label>
                        <div className="space-y-2.5 mt-1.5">
                          <label className="flex items-center gap-2.5 text-sm text-stone-700 dark:text-stone-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={accessPembelian}
                              onChange={(e) => setAccessPembelian(e.target.checked)}
                              className="h-4 w-4 rounded border-stone-300 dark:border-stone-700 text-stone-900 dark:text-zinc-100 focus:ring-stone-400 accent-stone-900 dark:accent-zinc-100 cursor-pointer"
                            />
                            <span>Akses Modul Pembelian (Tiket Sawit)</span>
                          </label>

                          <label className="flex items-center gap-2.5 text-sm text-stone-700 dark:text-stone-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={accessPenjualan}
                              onChange={(e) => setAccessPenjualan(e.target.checked)}
                              className="h-4 w-4 rounded border-stone-300 dark:border-stone-700 text-stone-900 dark:text-zinc-100 focus:ring-stone-400 accent-stone-900 dark:accent-zinc-100 cursor-pointer"
                            />
                            <span>Akses Modul Penjualan (Invoice BGA)</span>
                          </label>

                          <label className="flex items-center gap-2.5 text-sm text-stone-700 dark:text-stone-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={accessKas}
                              onChange={(e) => setAccessKas(e.target.checked)}
                              className="h-4 w-4 rounded border-stone-300 dark:border-stone-700 text-stone-900 dark:text-zinc-100 focus:ring-stone-400 accent-stone-900 dark:accent-zinc-100 cursor-pointer"
                            />
                            <span>Akses Modul Buku Kas (Mutasi Rekening)</span>
                          </label>

                          <label className="flex items-center gap-2.5 text-sm text-stone-700 dark:text-stone-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={accessBiaya}
                              onChange={(e) => setAccessBiaya(e.target.checked)}
                              className="h-4 w-4 rounded border-stone-300 dark:border-stone-700 text-stone-900 dark:text-zinc-100 focus:ring-stone-400 accent-stone-900 dark:accent-zinc-100 cursor-pointer"
                            />
                            <span>Akses Modul Biaya Operasional</span>
                          </label>

                          <label className="flex items-center gap-2.5 text-sm text-stone-700 dark:text-stone-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={accessDelete}
                              onChange={(e) => setAccessDelete(e.target.checked)}
                              className="h-4 w-4 rounded border-stone-300 dark:border-stone-700 text-stone-900 dark:text-zinc-100 focus:ring-stone-400 accent-stone-900 dark:accent-zinc-100 cursor-pointer"
                            />
                            <span className="text-red-500 dark:text-red-400 font-medium">Akses Hapus Transaksi (Hapus Data)</span>
                          </label>
                        </div>
                      </div>

                      <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => setAddUserOpen(false)} className="border-stone-200">
                          Batal
                        </Button>
                        <Button type="submit" disabled={submittingUser} className="bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-stone-900 text-white">
                          {submittingUser ? 'Menyimpan...' : 'Tambahkan'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#1E1E1E] overflow-hidden">
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
                              ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
                              : user.role === 'admin'
                              ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                              : 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50'
                          }`}>
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {isOwner && user.id !== currentUser.id ? (
                            <div className="flex items-center justify-end gap-1.5">
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
                                      <Button type="submit" disabled={resettingPass} className="bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-stone-900 text-white">
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
                                    className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
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
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                      onClick={() => handleDeleteUser(user.id, user.name)}
                                    >
                                      Hapus
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
            </CardContent>
          </Card>
        )}

        {activeTab === 'pajak' && (
          <Card className="dark:bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold tracking-tight">Konfigurasi Pajak &amp; Neraca</CardTitle>
              <CardDescription>Atur tarif pajak dan modal awal untuk laporan keuangan.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  localStorage.setItem('tax_tarif_ppn', tarifPpn)
                  localStorage.setItem('tax_tarif_pph_badan', tarifPphBadan)
                  localStorage.setItem('tax_nominal_pph25', nominalPph25)
                  localStorage.setItem('neraca_modal_awal', modalAwal)
                  toast.success('Konfigurasi pajak berhasil disimpan')
                }}
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="tarifPpn">Tarif PPN (%)</Label>
                    <Input id="tarifPpn" type="number" step="0.1" value={tarifPpn} onChange={(e) => setTarifPpn(e.target.value)} />
                    <p className="text-[11px] text-muted-foreground">Saat ini 11%. Berlaku untuk setiap penjualan ke BGA.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tarifPph">Tarif PPh Badan (%)</Label>
                    <Input id="tarifPph" type="number" step="0.1" value={tarifPphBadan} onChange={(e) => setTarifPphBadan(e.target.value)} />
                    <p className="text-[11px] text-muted-foreground">22% dari laba kena pajak (tahunan).</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nominalPph25">PPh Pasal 25 / bulan (Rp)</Label>
                    <Input id="nominalPph25" type="number" value={nominalPph25} onChange={(e) => setNominalPph25(e.target.value)} />
                    <p className="text-[11px] text-muted-foreground">Cicilan bulanan. Dibayar paling lambat tgl 15 bulan berikutnya.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="modalAwal">Modal Awal Neraca (Rp)</Label>
                    <Input id="modalAwal" type="number" value={modalAwal} onChange={(e) => setModalAwal(e.target.value)} />
                    <p className="text-[11px] text-muted-foreground">Modal awal pemilik untuk laporan neraca.</p>
                  </div>
                </div>
                <div className="pt-3">
                  <Button type="submit" className="bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-stone-900 text-white cursor-pointer">
                    Simpan Konfigurasi Pajak
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === 'printer' && (
          <ThermalPrinterSettings />
        )}

        {activeTab === 'theme' && (
          <Card className="dark:bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold tracking-tight">Tampilan &amp; Tema</CardTitle>
              <CardDescription>Pilih tema tampilan aplikasi yang paling nyaman untuk Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Mode otomatis mengikuti pengaturan tema perangkat komputer atau HP kamu.
              </p>
              <ThemeSelector />
            </CardContent>
          </Card>
        )}

        {activeTab === 'backup' && (
          <Card className="dark:bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-1.5">
                <Download className="h-5 w-5 text-stone-700 dark:text-zinc-300" />
                Ekspor &amp; Pemulihan Data
              </CardTitle>
              <CardDescription>Cadangkan seluruh database konfigurasi atau bersihkan sistem keuangan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export backup section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" /> Ekspor Konfigurasi
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
                  <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Danger Zone (Zona Berbahaya)
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 max-w-xl leading-relaxed">
                    Menghapus data akan memusnahkan seluruh riwayat kas, pembelian tiket sawit, penjualan BGA, dan biaya operasional. Tindakan ini tidak dapat dibatalkan. Hanya direkomendasikan saat memulai pembukuan tahun fiskal baru.
                  </p>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" /> Bersihkan Seluruh Data Transaksi
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600">Yakin ingin menghapus seluruh data?</AlertDialogTitle>
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
                          className="bg-red-600 hover:bg-red-700 text-white"
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
