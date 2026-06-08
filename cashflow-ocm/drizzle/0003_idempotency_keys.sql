-- Anti-dobel race-proof: kolom idempotency_key + UNIQUE index di 5 tabel uang.
-- ADDITIF MURNI: kolom nullable (baris lama = NULL), dan di SQLite UNIQUE index
-- mengizinkan banyak NULL -> tidak ada konflik dengan data lama. Backward-compatible
-- (kode lama tidak terpengaruh). Diterapkan via: tsx scripts/add-idempotency-columns.ts
-- (skrip itu idempoten & aman). Jangan pakai drizzle-kit push/migrate karena meta
-- snapshot saat ini drift dari DB nyata.

ALTER TABLE `pembelian` ADD COLUMN `idempotency_key` text;
CREATE UNIQUE INDEX IF NOT EXISTS `pembelian_idempotency_key_idx` ON `pembelian` (`idempotency_key`);

ALTER TABLE `penjualan` ADD COLUMN `idempotency_key` text;
CREATE UNIQUE INDEX IF NOT EXISTS `penjualan_idempotency_key_idx` ON `penjualan` (`idempotency_key`);

ALTER TABLE `biaya_operasional` ADD COLUMN `idempotency_key` text;
CREATE UNIQUE INDEX IF NOT EXISTS `biaya_operasional_idempotency_key_idx` ON `biaya_operasional` (`idempotency_key`);

ALTER TABLE `transaksi_kas` ADD COLUMN `idempotency_key` text;
CREATE UNIQUE INDEX IF NOT EXISTS `transaksi_kas_idempotency_key_idx` ON `transaksi_kas` (`idempotency_key`);

ALTER TABLE `modal_peron` ADD COLUMN `idempotency_key` text;
CREATE UNIQUE INDEX IF NOT EXISTS `modal_peron_idempotency_key_idx` ON `modal_peron` (`idempotency_key`);
