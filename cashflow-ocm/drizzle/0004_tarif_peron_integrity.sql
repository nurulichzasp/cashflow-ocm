CREATE TABLE IF NOT EXISTS `tarif_peron` (
  `id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))) NOT NULL,
  `peron_id` text NOT NULL,
  `tanggal_berlaku` text NOT NULL,
  `kelebihan_per_kg` integer NOT NULL CHECK (`kelebihan_per_kg` >= 0),
  `brdl_sama_tbs` integer DEFAULT 1 NOT NULL CHECK (`brdl_sama_tbs` IN (0, 1)),
  `catatan` text,
  `created_by` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`peron_id`) REFERENCES `peron`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tarif_peron_peron_tanggal_idx` ON `tarif_peron` (`peron_id`, `tanggal_berlaku`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tarif_peron_tanggal_idx` ON `tarif_peron` (`tanggal_berlaku`);
--> statement-breakpoint
ALTER TABLE `pembelian` ADD COLUMN `brdl_sama_tbs` integer;
--> statement-breakpoint
UPDATE `pembelian` SET `brdl_sama_tbs` = CASE WHEN `tanggal` >= '2026-08-15' THEN 1 ELSE 0 END WHERE `brdl_sama_tbs` IS NULL;
--> statement-breakpoint
ALTER TABLE `modal_peron` ADD COLUMN `is_saldo_awal` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `modal_peron` SET `is_saldo_awal` = 1
WHERE `tanggal` = '2026-06-03' AND `jenis` = 'tambah'
  AND NOT EXISTS (SELECT 1 FROM `transaksi_kas` k WHERE k.`ref_tabel` = 'modal_peron' AND k.`ref_id` = `modal_peron`.`id`);
--> statement-breakpoint
INSERT INTO `tarif_peron` (`peron_id`, `tanggal_berlaku`, `kelebihan_per_kg`, `brdl_sama_tbs`, `catatan`, `created_by`)
SELECT p.id, '2026-08-15',
  CASE WHEN lower(trim(p.nama)) IN ('husein','wiranto','jono','neko','roni') THEN 90 ELSE 70 END,
  1, 'Rombakan tarif 15 Agustus 2026',
  (SELECT id FROM `user` WHERE lower(role) = 'owner' ORDER BY created_at LIMIT 1)
FROM `peron` p
WHERE lower(trim(p.nama)) IN ('husein','wiranto','jono','neko','roni','budi','ciput','iwan','nolin','pribadi','umum')
ON CONFLICT (`peron_id`, `tanggal_berlaku`) DO UPDATE SET
  `kelebihan_per_kg` = excluded.`kelebihan_per_kg`,
  `brdl_sama_tbs` = excluded.`brdl_sama_tbs`,
  `catatan` = excluded.`catatan`;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `pembelian_tanggal_created_idx` ON `pembelian` (`tanggal`, `created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `pembelian_peron_idx` ON `pembelian` (`peron_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `pembelian_status_idx` ON `pembelian` (`status_bayar_peron`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `pembelian_detail_parent_order_idx` ON `pembelian_detail` (`pembelian_id`, `urutan`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `pembelian_foto_parent_idx` ON `pembelian_foto` (`pembelian_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `penjualan_tanggal_created_idx` ON `penjualan` (`tanggal`, `created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `biaya_tanggal_created_idx` ON `biaya_operasional` (`tanggal`, `created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `biaya_akun_idx` ON `biaya_operasional` (`akun_sumber_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `biaya_foto_parent_idx` ON `biaya_foto` (`biaya_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `kas_tanggal_created_idx` ON `transaksi_kas` (`tanggal`, `created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `kas_akun_arah_idx` ON `transaksi_kas` (`akun_id`, `arah`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `kas_ref_unique_idx` ON `transaksi_kas` (`ref_tabel`, `ref_id`) WHERE `ref_tabel` IS NOT NULL AND `ref_id` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `modal_peron_tanggal_idx` ON `modal_peron` (`peron_id`, `tanggal`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `harga_produk_tanggal_idx` ON `harga_acuan` (`produk`, `tanggal_berlaku`, `created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_created_idx` ON `activity_log` (`created_at`);
