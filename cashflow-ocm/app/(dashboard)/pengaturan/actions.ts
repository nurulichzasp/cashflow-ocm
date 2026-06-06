'use server'

import { db } from '@/lib/db'
import { user, account } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { hashPassword } from '@better-auth/utils/password'

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

  // Hapus dari tabel user (cascade akan menghapus data di account dan session)
  await db.delete(user).where(eq(user.id, targetUserId))

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
