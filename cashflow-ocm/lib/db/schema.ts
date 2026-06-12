import { relations, sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

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
  saldoAwal: integer('saldo_awal').notNull().default(0),
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
  keuntunganPerKg: integer('keuntungan_per_kg').notNull().default(50),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const modalPeron = sqliteTable('modal_peron', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  peronId: text('peron_id').notNull().references(() => peron.id, { onDelete: 'cascade' }),
  tanggal: text('tanggal').notNull(),
  jenis: text('jenis', { enum: ['tambah', 'kurang', 'kembali'] }).notNull(),
  jumlah: integer('jumlah').notNull(),
  catatan: text('catatan'),
  createdBy: text('created_by').notNull().references(() => user.id),
  idempotencyKey: text('idempotency_key'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => ({
  idempotencyIdx: uniqueIndex('modal_peron_idempotency_key_idx').on(t.idempotencyKey),
}))

export const hargaAcuan = sqliteTable('harga_acuan', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  tanggalBerlaku: text('tanggal_berlaku').notNull(),
  produk: text('produk', { enum: ['TBS', 'BRDL KTWM', 'BRDL TRYM', 'BRDL LMDM'] }).notNull(),
  hargaLapangan: integer('harga_lapangan').notNull(),
  selisihJualBga: integer('selisih_jual_bga').notNull().default(120),
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
  hargaJual: integer('harga_jual').notNull().default(0),
  hargaBeli: integer('harga_beli').notNull().default(0),
  // aggregate fields
  kategori: text('kategori', { enum: ['OCM R1', 'OCM R2', 'OCMP SAGU', 'OCM BRDL', 'OCM BRDL KTWM', 'OCM BRDL TRYM', 'OCM BRDL LMDM'] }).notNull().default('OCM R1'),
  peronId: text('peron_id').notNull().references(() => peron.id),
  tonase: real('tonase').notNull().default(0), // tetap real (berat kg bisa pecahan)
  totalJual: integer('total_jual').notNull().default(0),
  totalBeli: integer('total_beli').notNull().default(0),
  keuntungan: integer('keuntungan').notNull().default(0),
  statusBayarPeron: text('status_bayar_peron', { enum: ['belum', 'lunas'] }).notNull().default('belum'),
  tanggalBayar: text('tanggal_bayar'),
  sumberBayarId: text('sumber_bayar_id').references(() => akunKas.id),
  catatan: text('catatan'),
  // Keterangan ringkas tiket (auto-isi "Total N Replas (rentang)", bisa diedit manual)
  keterangan: text('keterangan'),
  createdBy: text('created_by').notNull().references(() => user.id),
  idempotencyKey: text('idempotency_key'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => ({
  idempotencyIdx: uniqueIndex('pembelian_idempotency_key_idx').on(t.idempotencyKey),
}))

// Detail per line item (satu TID = satu baris)
export const pembelianDetail = sqliteTable('pembelian_detail', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  pembelianId: text('pembelian_id').notNull().references(() => pembelian.id, { onDelete: 'cascade' }),
  noTid: text('no_tid'),
  nopol: text('nopol'),
  supir: text('supir'),
  tonase: real('tonase').notNull(), // tetap real (berat kg bisa pecahan)
  hargaLapangan: integer('harga_lapangan').notNull(),
  subtotalBeli: integer('subtotal_beli').notNull(),
  subtotalJual: integer('subtotal_jual').notNull(),
  keuntungan: integer('keuntungan').notNull(),
  urutan: integer('urutan').notNull().default(0),
  tanggalReplas: text('tanggal_replas'), // awal rentang replas ("dari"). bongkar di PKS (opsional)
  tanggalReplasSampai: text('tanggal_replas_sampai'), // akhir rentang ("sampai"). null = tanggal tunggal
  jumlahReplas: integer('jumlah_replas'), // jumlah replas yang membentuk tonase baris ini
})

export const penjualan = sqliteTable('penjualan', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  tanggal: text('tanggal').notNull(),
  noBast: text('no_bast'),
  noInvoice: text('no_invoice'),
  statusBayar: text('status_bayar', { enum: ['belum', 'lunas'] }).notNull().default('belum'),
  tanggalBayarBga: text('tanggal_bayar_bga'),
  totalBersih: integer('total_bersih'),
  totalNilai: integer('total_nilai'),
  catatan: text('catatan'),
  createdBy: text('created_by').notNull().references(() => user.id),
  idempotencyKey: text('idempotency_key'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => ({
  idempotencyIdx: uniqueIndex('penjualan_idempotency_key_idx').on(t.idempotencyKey),
}))

export const penjualanDetail = sqliteTable('penjualan_detail', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  penjualanId: text('penjualan_id').notNull().references(() => penjualan.id, { onDelete: 'cascade' }),
  produk: text('produk', { enum: ['TBS', 'BRDL'] }).notNull(),
  qtyKg: real('qty_kg').notNull(), // tetap real (berat kg bisa pecahan)
  hargaJual: integer('harga_jual').notNull(),
  subtotal: integer('subtotal').notNull(),
})

export const biayaOperasional = sqliteTable('biaya_operasional', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  tanggal: text('tanggal').notNull(),
  kategori: text('kategori', { enum: ['gaji', 'solar', 'transport', 'lainnya'] }).notNull(),
  jumlah: integer('jumlah').notNull(),
  akunSumberId: text('akun_sumber_id').notNull().references(() => akunKas.id),
  catatan: text('catatan'),
  createdBy: text('created_by').notNull().references(() => user.id),
  idempotencyKey: text('idempotency_key'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => ({
  idempotencyIdx: uniqueIndex('biaya_operasional_idempotency_key_idx').on(t.idempotencyKey),
}))

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
  jumlah: integer('jumlah').notNull(),
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
  idempotencyKey: text('idempotency_key'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => ({
  idempotencyIdx: uniqueIndex('transaksi_kas_idempotency_key_idx').on(t.idempotencyKey),
}))

export const ppnBulanan = sqliteTable('ppn_bulanan', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  bulan: text('bulan').notNull(), // format YYYY-MM
  totalPpn: integer('total_ppn').notNull().default(0),
  statusSetor: text('status_setor', { enum: ['belum', 'sudah'] }).notNull().default('belum'),
  tanggalSetor: text('tanggal_setor'),
  catatan: text('catatan'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const pphBulanan = sqliteTable('pph_bulanan', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(8))))`),
  bulan: text('bulan').notNull(), // format YYYY-MM
  nominal: integer('nominal').notNull().default(698917),
  statusBayar: text('status_bayar', { enum: ['belum', 'sudah'] }).notNull().default('belum'),
  tanggalBayar: text('tanggal_bayar'),
  catatan: text('catatan'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

// Key-value pengaturan global (sinkron lintas perangkat/pengguna).
// Contoh: key='neraca_modal_awal' → Modal Awal pada laporan Neraca.
export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
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

// ─── Kesehatan Peron (early-warning peron melemah, berbasis share) ──────────────

// Snapshot mingguan per peron — sumber grafik & tren
export const peronSnapshot = sqliteTable('peron_snapshot', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  peronId: text('peron_id').notNull().references(() => peron.id, { onDelete: 'cascade' }),
  weekStart: text('week_start').notNull(), // ISO Senin "YYYY-MM-DD"
  totalKg: real('total_kg').notNull().default(0), // kg real (tonase pecahan)
  setorCount: integer('setor_count').notNull().default(0),
  share: real('share').notNull().default(0), // 0..1
  isOperationalWeek: integer('is_operational_week', { mode: 'boolean' }).notNull().default(true),
  computedAt: integer('computed_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (t) => ({
  uq: uniqueIndex('peron_snapshot_peron_week_idx').on(t.peronId, t.weekStart),
}))

// Status kesehatan terkini per peron — 1 baris/peron, untuk list & badge instan
export const peronHealth = sqliteTable('peron_health', {
  peronId: text('peron_id').primaryKey().references(() => peron.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['normal', 'perhatian', 'kritis', 'data_kurang'] }).notNull().default('data_kurang'),
  shareCurrent: real('share_current').notNull().default(0),
  shareBase: real('share_base').notNull().default(0),
  shareDelta: real('share_delta').notNull().default(0),
  declineWeeks: integer('decline_weeks').notNull().default(0),
  typicalGap: real('typical_gap').notNull().default(0),
  daysSinceLast: integer('days_since_last').notNull().default(0),
  lastSetorDate: text('last_setor_date'), // "YYYY-MM-DD" | null
  seasonVerdict: text('season_verdict', { enum: ['musim', 'lari'] }), // | null
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

// Token akses portal publik per peron (read-only, transparansi via link WA)
export const peronAccess = sqliteTable('peron_access', {
  peronId: text('peron_id').primaryKey().references(() => peron.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(), // crypto-random 64 hex char
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  issuedAt: integer('issued_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastViewedAt: integer('last_viewed_at', { mode: 'timestamp' }),
})

// Log tindak lanjut — deteksi tanpa aksi = percuma
export const peronFollowup = sqliteTable('peron_followup', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  peronId: text('peron_id').notNull().references(() => peron.id, { onDelete: 'cascade' }),
  triggeredStatus: text('triggered_status').notNull(),
  contacted: integer('contacted', { mode: 'boolean' }).notNull().default(false),
  reason: text('reason', { enum: ['harga_kalah', 'pindah_cv', 'masalah_operasional', 'memang_musim', 'lainnya'] }),
  note: text('note'),
  outcome: text('outcome', { enum: ['kembali_normal', 'masih_pantau', 'hilang'] }),
  createdBy: text('created_by').references(() => user.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const akunKasRelations = relations(akunKas, ({ many }) => ({
  transaksi: many(transaksiKas),
  pembelian: many(pembelian),
  biaya: many(biayaOperasional),
}))

export const peronRelations = relations(peron, ({ many, one }) => ({
  modalPeron: many(modalPeron),
  pembelian: many(pembelian),
  snapshots: many(peronSnapshot),
  health: one(peronHealth, { fields: [peron.id], references: [peronHealth.peronId] }),
  followups: many(peronFollowup),
}))

export const peronSnapshotRelations = relations(peronSnapshot, ({ one }) => ({
  peron: one(peron, { fields: [peronSnapshot.peronId], references: [peron.id] }),
}))

export const peronHealthRelations = relations(peronHealth, ({ one }) => ({
  peron: one(peron, { fields: [peronHealth.peronId], references: [peron.id] }),
}))

export const peronFollowupRelations = relations(peronFollowup, ({ one }) => ({
  peron: one(peron, { fields: [peronFollowup.peronId], references: [peron.id] }),
  createdByUser: one(user, { fields: [peronFollowup.createdBy], references: [user.id] }),
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
export type AppSetting = typeof appSettings.$inferSelect
export type PembelianFoto = typeof pembelianFoto.$inferSelect
export type BiayaFoto = typeof biayaFoto.$inferSelect
export type PpnBulanan = typeof ppnBulanan.$inferSelect
export type PphBulanan = typeof pphBulanan.$inferSelect
export type PeronSnapshot = typeof peronSnapshot.$inferSelect
export type PeronHealth = typeof peronHealth.$inferSelect
export type PeronFollowup = typeof peronFollowup.$inferSelect
export type PeronAccess = typeof peronAccess.$inferSelect
