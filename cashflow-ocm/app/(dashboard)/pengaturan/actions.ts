'use server'

import { db } from '@/lib/db'
import { user, account, ppnBulanan, pphBulanan, appSettings } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { hashPassword } from '@better-auth/utils/password'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/audit'

// 1. Update profil user yang sedang login
export async function updateProfile(data: {
  name?: string
  image?: string
  nickname?: string
  fullName?: string
  companyEmail?: string
  personalEmail?: string
  phone?: string
  address?: string
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    throw new Error('Tidak terautentikasi')
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  }
  if (data.name) updateData.name = data.name
  if (data.image !== undefined) updateData.image = data.image
  if (data.nickname !== undefined) updateData.nickname = data.nickname
  if (data.fullName !== undefined) {
    updateData.fullName = data.fullName
    updateData.name = data.fullName
  }
  if (data.companyEmail !== undefined) updateData.companyEmail = data.companyEmail
  if (data.personalEmail !== undefined) updateData.personalEmail = data.personalEmail
  if (data.phone !== undefined) updateData.phone = data.phone
  if (data.address !== undefined) updateData.address = data.address

  await db
    .update(user)
    .set(updateData)
    .where(eq(user.id, session.user.id))

  revalidatePath('/')
  return { success: true }
}

// 2. Tambah pengguna baru (Admin / Owner / Lainnya)
export async function addUser(data: { name: string; email: string; password: string; role: string; permissions?: string }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'owner') {
    throw new Error('Hanya Owner yang dapat menambahkan pengguna')
  }

  const email = data.email.toLowerCase()

  // Validasi dasar (signUpEmail publik sudah dimatikan via disableSignUp,
  // jadi kita buat user server-side langsung di sini).
  if (!email.includes('@')) throw new Error('Email tidak valid')
  if (!data.password || data.password.length < 8) {
    throw new Error('Kata sandi minimal 8 karakter')
  }

  // Cek apakah email sudah ada
  const existing = await db.query.user.findFirst({ where: eq(user.email, email) })
  if (existing) {
    throw new Error('Email sudah terdaftar')
  }

  const newUserId = crypto.randomUUID()
  const now = new Date()
  const hashedPassword = await hashPassword(data.password)

  // Buat user + akun credential dalam satu transaksi agar atomic
  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id: newUserId,
      name: data.name,
      email,
      emailVerified: true,
      role: data.role,
      permissions: data.permissions || null,
      createdAt: now,
      updatedAt: now,
    })

    await tx.insert(account).values({
      id: crypto.randomUUID(),
      userId: newUserId,
      accountId: newUserId,
      providerId: 'credential',
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    })
  })

  revalidatePath('/')
  return { success: true }
}

// 3. Hapus pengguna
export async function deleteUser(targetUserId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'owner') {
    throw new Error('Hanya Owner yang dapat menghapus pengguna')
  }

  if (session.user.id === targetUserId) {
    throw new Error('Anda tidak dapat menghapus akun Anda sendiri')
  }

  // Ambil data target dulu untuk jejak audit — hapus user = aksi admin sensitif
  // (cascade ke account + session), wajib tercatat siapa & kapan.
  const target = await db.query.user.findFirst({ where: eq(user.id, targetUserId) })

  // Hapus dari tabel user (cascade akan menghapus data di account dan session)
  await db.delete(user).where(eq(user.id, targetUserId))

  await logActivity({
    userId: session.user.id,
    action: 'delete',
    entityType: 'user',
    entityId: targetUserId,
    description: `Hapus pengguna ${target?.name ?? targetUserId}${target?.email ? ` (${target.email})` : ''}${target?.role ? ` • role ${target.role}` : ''}`,
    oldValues: target ? { name: target.name, email: target.email, role: target.role } : undefined,
  })

  revalidatePath('/')
  return { success: true }
}

// 4. Update role pengguna
export async function updateUserRole(targetUserId: string, role: 'owner' | 'admin') {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'owner') {
    throw new Error('Hanya Owner yang dapat mengubah peran pengguna')
  }

  await db
    .update(user)
    .set({
      role,
      updatedAt: new Date(),
    })
    .where(eq(user.id, targetUserId))

  revalidatePath('/')
  return { success: true }
}

// 4b. Ganti email LOGIN pengguna (owner-only) — bisa untuk diri sendiri atau pengguna lain.
// PENTING: "email login" = kolom user.email yang dipakai Better Auth untuk sign-in,
// BUKAN companyEmail/personalEmail (itu hanya metadata kontak di updateProfile).
// Sesi yang sedang aktif tetap valid (sesi dikunci ke userId/token, bukan email),
// jadi mengganti email sendiri TIDAK membuat owner ter-logout — login berikutnya pakai email baru.
export async function updateUserEmail(targetUserId: string, newEmail: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'owner') {
    throw new Error('Hanya Owner yang dapat mengubah email login')
  }

  const email = newEmail.trim().toLowerCase()
  // Validasi format sederhana (sejalan dengan addUser).
  if (!email || !email.includes('@') || /\s/.test(email)) {
    throw new Error('Email tidak valid')
  }

  const target = await db.query.user.findFirst({ where: eq(user.id, targetUserId) })
  if (!target) throw new Error('Pengguna tidak ditemukan')
  if (target.email === email) return { success: true } // tidak ada perubahan

  // Email harus unik — cek dulu agar pesannya ramah (UNIQUE index tetap jadi penjaga akhir).
  const existing = await db.query.user.findFirst({ where: eq(user.email, email) })
  if (existing && existing.id !== targetUserId) {
    throw new Error('Email sudah dipakai pengguna lain')
  }

  const oldEmail = target.email
  await db
    .update(user)
    .set({ email, emailVerified: true, updatedAt: new Date() })
    .where(eq(user.id, targetUserId))

  await logActivity({
    userId: session.user.id,
    action: 'update',
    entityType: 'user',
    entityId: targetUserId,
    description: `Ganti email login ${target.name}: ${oldEmail} → ${email}`,
    oldValues: { email: oldEmail },
    newValues: { email },
  })

  revalidatePath('/')
  return { success: true }
}

// 5. Reset password pengguna lain
export async function resetUserPassword(targetUserId: string, newPassword: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'owner') {
    throw new Error('Hanya Owner yang dapat mereset sandi pengguna')
  }

  const hashedPassword = await hashPassword(newPassword)

  // Cek apakah akun credential sudah ada
  const existingAccount = await db.query.account.findFirst({
    where: and(
      eq(account.userId, targetUserId),
      eq(account.providerId, 'credential')
    ),
  })

  if (existingAccount) {
    await db
      .update(account)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(and(
        eq(account.userId, targetUserId),
        eq(account.providerId, 'credential')
      ))
  } else {
    await db.insert(account).values({
      id: crypto.randomUUID(),
      userId: targetUserId,
      accountId: targetUserId,
      providerId: 'credential',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  revalidatePath('/')
  return { success: true }
}

// 6. Update hak akses (permissions per modul) pengguna lain
export async function updateUserPermissions(targetUserId: string, permissions: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'owner') {
    throw new Error('Hanya Owner yang dapat mengubah hak akses pengguna')
  }

  // Validasi: pastikan payload JSON yang valid sebelum disimpan.
  try {
    JSON.parse(permissions)
  } catch {
    throw new Error('Format hak akses tidak valid')
  }

  await db
    .update(user)
    .set({ permissions, updatedAt: new Date() })
    .where(eq(user.id, targetUserId))

  revalidatePath('/')
  return { success: true }
}

// ─── PPN / PPh Tracking ──────────────────────────────────────────────────────

export async function updatePpnStatus(bulan: string, statusSetor: 'belum' | 'sudah', tanggalSetor?: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'owner') throw new Error('Hanya Owner')

  const existing = await db.query.ppnBulanan.findFirst({ where: eq(ppnBulanan.bulan, bulan) })
  if (existing) {
    await db.update(ppnBulanan).set({ statusSetor, tanggalSetor: tanggalSetor ?? null }).where(eq(ppnBulanan.id, existing.id))
  } else {
    await db.insert(ppnBulanan).values({ bulan, totalPpn: 0, statusSetor, tanggalSetor: tanggalSetor ?? null })
  }
  revalidatePath('/laporan')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updatePphStatus(bulan: string, statusBayar: 'belum' | 'sudah', tanggalBayar?: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'owner') throw new Error('Hanya Owner')

  const existing = await db.query.pphBulanan.findFirst({ where: eq(pphBulanan.bulan, bulan) })
  if (existing) {
    await db.update(pphBulanan).set({ statusBayar, tanggalBayar: tanggalBayar ?? null }).where(eq(pphBulanan.id, existing.id))
  } else {
    await db.insert(pphBulanan).values({ bulan, statusBayar, tanggalBayar: tanggalBayar ?? null })
  }
  revalidatePath('/laporan')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getPpnList() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Tidak terautentikasi')
  requirePermission(session.user.role, 'canViewFinance')
  return db.select().from(ppnBulanan).orderBy(ppnBulanan.bulan)
}

export async function getPphList() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Tidak terautentikasi')
  requirePermission(session.user.role, 'canViewFinance')
  return db.select().from(pphBulanan).orderBy(pphBulanan.bulan)
}

// ─── App Settings (key-value global, sinkron lintas perangkat) ───────────────

// Baca satu pengaturan global. Cukup terautentikasi (read-only).
export async function getAppSetting(key: string): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Tidak terautentikasi')

  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, key) })
  return row?.value ?? null
}

// Tulis satu pengaturan global. Owner-only (upsert berdasarkan key).
export async function setAppSetting(key: string, value: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'owner') {
    throw new Error('Hanya Owner yang dapat mengubah pengaturan ini')
  }

  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    })

  revalidatePath('/laporan')
  revalidatePath('/pengaturan')
  return { success: true }
}

// Baca banyak pengaturan sekaligus (1 query). Dipakai server component utk render
// nilai awal form → tanpa flash default→asli. Cukup terautentikasi.
export async function getAppSettings(keys: string[]): Promise<Record<string, string | null>> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Tidak terautentikasi')

  const out: Record<string, string | null> = {}
  for (const k of keys) out[k] = null
  if (keys.length === 0) return out

  const rows = await db.select().from(appSettings).where(inArray(appSettings.key, keys))
  for (const r of rows) out[r.key] = r.value
  return out
}

// Tulis banyak pengaturan sekaligus (upsert per key). Owner-only.
export async function setAppSettings(entries: Record<string, string>) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== 'owner') {
    throw new Error('Hanya Owner yang dapat mengubah pengaturan ini')
  }

  const now = new Date()
  for (const [key, value] of Object.entries(entries)) {
    await db
      .insert(appSettings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: now } })
  }

  revalidatePath('/laporan')
  revalidatePath('/pengaturan')
  return { success: true }
}
