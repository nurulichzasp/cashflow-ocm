import { relations, sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// ─── Better Auth Tables ──────────────────────────────────────────────────────

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('viewer'),
  nickname: text('nickname'),
  fullName: text('full_name'),
  companyEmail: text('company_email'),
  personalEmail: text('personal_email'),
  phone: text('phone'),
  address: text('address'),
  permissions: text('permissions'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ─── Domain Tables ────────────────────────────────────────────────────────────

export const akunKas = sqliteTable('akun_kas', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  nama: text('nama').notNull(),
  tipe: text('tipe', { enum: ['bank', 'tunai'] }).notNull().default('bank'),
  saldoAwal: real('saldo_awal').notNull().default(0),
  urutan: integer('urutan').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const peron = sqliteTable('peron', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  kode: integer('kode'),
  nama: text('nama').notNull(),
  kontak: text('kontak'),
  alamat: text('alamat'),
  status: text('status', { enum: ['aktif', 'nonaktif'] }).notNull().default('aktif'),
  keuntunganPerKg: real('keuntungan_per_kg').notNull().default(50),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const modalPeron = sqliteTable('modal_peron', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  peronId: text('peron_id').notNull().references(() => peron.id, { onDelete: 'cascade' }),
  tanggal: text('tanggal').notNull(),
  jenis: text('jenis', { enum: ['tambah', 'kurang', 'kembali'] }).notNull(),
  jumlah: real('jumlah').notNull(),
  catatan: text('catatan'),
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const hargaAcuan = sqliteTable('harga_acuan', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  tanggalBerlaku: text('tanggal_berlaku').notNull(),
  produk: text('produk', { enum: ['TBS', 'BRDL'] }).notNull(),
  hargaLapangan: real('harga_lapangan').notNull(),
  selisihJualBga: real('selisih_jual_bga').notNull().default(120),
  catatan: text('catatan'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

// Header transaksi pembelian (bisa punya banyak detail / line item)
export const pembelian = sqliteTable('pembelian', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  tanggal: text('tanggal').notNull(),
  // legacy single-TID fields (nullable, untuk data lama)
  noTid: text('no_tid'),
  nopol: text('nopol'),
  supir: text('supir'),
  hargaJual: real('harga_jual').notNull().default(0),
  hargaBeli: real('harga_beli').notNull().default(0),
  // aggregate fields
  kategori: text('kategori', { enum: ['OCM R1', 'OCM R2', 'OCMP SAGU', 'OCM BRDL'] }).notNull().default('OCM R1'),
  peronId: text('peron_id').notNull().references(() => peron.id),
  tonase: real('tonase').notNull().default(0),
  totalJual: real('total_jual').notNull().default(0),
  totalBeli: real('total_beli').notNull().default(0),
  keuntungan: real('keuntungan').notNull().default(0),
  statusBayarPeron: text('status_bayar_peron', { enum: ['belum', 'lunas'] }).notNull().default('belum'),
  tanggalBayar: text('tanggal_bayar'),
  sumberBayarId: text('sumber_bayar_id').references(() => akunKas.id),
  catatan: text('catatan'),
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

// Detail per line item (satu TID = satu baris)
export const pembelianDetail = sqliteTable('pembelian_detail', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  pembelianId: text('pembelian_id').notNull().references(() => pembelian.id, { onDelete: 'cascade' }),
  noTid: text('no_tid'),
  nopol: text('nopol'),
  supir: text('supir'),
  tonase: real('tonase').notNull(),
  hargaLapangan: real('harga_lapangan').notNull(), // harga bayar ke peron
  subtotalBeli: real('subtotal_beli').notNull(),
  subtotalJual: real('subtotal_jual').notNull(),
  keuntungan: real('keuntungan').notNull(),
  urutan: integer('urutan').notNull().default(0),
  tanggalReplas: text('tanggal_replas'), // tanggal replas bongkar di PKS (opsional)
})

export const penjualan = sqliteTable('penjualan', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  tanggal: text('tanggal').notNull(),
  noBast: text('no_bast'),
  noInvoice: text('no_invoice'),
  statusBayar: text('status_bayar', { enum: ['belum', 'lunas'] }).notNull().default('belum'),
  tanggalBayarBga: text('tanggal_bayar_bga'),
  totalBersih: real('total_bersih'),
  totalNilai: real('total_nilai'),
  catatan: text('catatan'),
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const penjualanDetail = sqliteTable('penjualan_detail', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  penjualanId: text('penjualan_id').notNull().references(() => penjualan.id, { onDelete: 'cascade' }),
  produk: text('produk', { enum: ['TBS', 'BRDL'] }).notNull(),
  qtyKg: real('qty_kg').notNull(),
  hargaJual: real('harga_jual').notNull(),
  subtotal: real('subtotal').notNull(),
})

export const biayaOperasional = sqliteTable('biaya_operasional', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  tanggal: text('tanggal').notNull(),
  kategori: text('kategori', { enum: ['gaji', 'solar', 'transport', 'lainnya'] }).notNull(),
  jumlah: real('jumlah').notNull(),
  akunSumberId: text('akun_sumber_id').notNull().references(() => akunKas.id),
  catatan: text('catatan'),
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const pembelianFoto = sqliteTable('pembelian_foto', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  pembelianId: text('pembelian_id').notNull().references(() => pembelian.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  keterangan: text('keterangan'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const biayaFoto = sqliteTable('biaya_foto', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  biayaId: text('biaya_id').notNull().references(() => biayaOperasional.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  keterangan: text('keterangan'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const transaksiKas = sqliteTable('transaksi_kas', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  tanggal: text('tanggal').notNull(),
  akunId: text('akun_id').notNull().references(() => akunKas.id),
  arah: text('arah', { enum: ['masuk', 'keluar'] }).notNull(),
  jumlah: real('jumlah').notNull(),
  kategori: text('kategori', {
    enum: [
      'penerimaan_bga',
      'tarik_bri',
      'bayar_peron',
      'modal_peron',
      'kembali_modal',
      'biaya_operasional',
      'penyesuaian',
      'lainnya',
    ],
  }).notNull(),
  refTabel: text('ref_tabel'),
  refId: text('ref_id'),
  transferGrup: text('transfer_grup'),
  catatan: text('catatan'),
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  userId: text('user_id').notNull().references(() => user.id),
  action: text('action').notNull(), // create, update, delete, view, export
  entityType: text('entity_type').notNull(), // pembelian, penjualan, biaya_operasional, transaksi_kas, etc
  entityId: text('entity_id'),
  description: text('description'), // Human-readable description of what happened
  oldValues: text('old_values'), // JSON string of previous values (for updates)
  newValues: text('new_values'), // JSON string of new values
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

// ─── Relations ─────────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  activityLogs: many(activityLog),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

export const akunKasRelations = relations(akunKas, ({ many }) => ({
  transaksi: many(transaksiKas),
  pembelian: many(pembelian),
  biaya: many(biayaOperasional),
}))

export const peronRelations = relations(peron, ({ many }) => ({
  modalPeron: many(modalPeron),
  pembelian: many(pembelian),
}))

export const modalPeronRelations = relations(modalPeron, ({ one }) => ({
  peron: one(peron, { fields: [modalPeron.peronId], references: [peron.id] }),
  createdByUser: one(user, { fields: [modalPeron.createdBy], references: [user.id] }),
}))

export const pembelianRelations = relations(pembelian, ({ one, many }) => ({
  peron: one(peron, { fields: [pembelian.peronId], references: [peron.id] }),
  sumberBayar: one(akunKas, { fields: [pembelian.sumberBayarId], references: [akunKas.id] }),
  createdByUser: one(user, { fields: [pembelian.createdBy], references: [user.id] }),
  fotos: many(pembelianFoto),
  details: many(pembelianDetail),
}))

export const pembelianDetailRelations = relations(pembelianDetail, ({ one }) => ({
  pembelian: one(pembelian, { fields: [pembelianDetail.pembelianId], references: [pembelian.id] }),
}))

export const pembelianFotoRelations = relations(pembelianFoto, ({ one }) => ({
  pembelian: one(pembelian, { fields: [pembelianFoto.pembelianId], references: [pembelian.id] }),
}))

export const penjualanRelations = relations(penjualan, ({ one, many }) => ({
  detail: many(penjualanDetail),
  createdByUser: one(user, { fields: [penjualan.createdBy], references: [user.id] }),
}))

export const penjualanDetailRelations = relations(penjualanDetail, ({ one }) => ({
  penjualan: one(penjualan, { fields: [penjualanDetail.penjualanId], references: [penjualan.id] }),
}))

export const biayaOperasionalRelations = relations(biayaOperasional, ({ one, many }) => ({
  akunSumber: one(akunKas, { fields: [biayaOperasional.akunSumberId], references: [akunKas.id] }),
  createdByUser: one(user, { fields: [biayaOperasional.createdBy], references: [user.id] }),
  fotos: many(biayaFoto),
}))

export const biayaFotoRelations = relations(biayaFoto, ({ one }) => ({
  biaya: one(biayaOperasional, { fields: [biayaFoto.biayaId], references: [biayaOperasional.id] }),
}))

export const transaksiKasRelations = relations(transaksiKas, ({ one }) => ({
  akun: one(akunKas, { fields: [transaksiKas.akunId], references: [akunKas.id] }),
  createdByUser: one(user, { fields: [transaksiKas.createdBy], references: [user.id] }),
}))

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(user, { fields: [activityLog.userId], references: [user.id] }),
}))

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof user.$inferSelect
export type Session = typeof session.$inferSelect
export type AkunKas = typeof akunKas.$inferSelect
export type Peron = typeof peron.$inferSelect
export type ModalPeron = typeof modalPeron.$inferSelect
export type HargaAcuan = typeof hargaAcuan.$inferSelect
export type Pembelian = typeof pembelian.$inferSelect
export type PembelianDetail = typeof pembelianDetail.$inferSelect
export type Penjualan = typeof penjualan.$inferSelect
export type PenjualanDetail = typeof penjualanDetail.$inferSelect
export type BiayaOperasional = typeof biayaOperasional.$inferSelect
export type TransaksiKas = typeof transaksiKas.$inferSelect
export type ActivityLog = typeof activityLog.$inferSelect
export type PembelianFoto = typeof pembelianFoto.$inferSelect
export type BiayaFoto = typeof biayaFoto.$inferSelect
