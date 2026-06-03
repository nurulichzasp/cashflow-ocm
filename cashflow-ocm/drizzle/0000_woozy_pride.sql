CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `biaya_operasional` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))) NOT NULL,
	`tanggal` text NOT NULL,
	`kategori` text NOT NULL,
	`jumlah` real NOT NULL,
	`akun_sumber` text NOT NULL,
	`catatan` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `harga_acuan` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))) NOT NULL,
	`tanggal_berlaku` text NOT NULL,
	`produk` text NOT NULL,
	`harga_lapangan` real NOT NULL,
	`selisih_jual_bga` real DEFAULT 120 NOT NULL,
	`catatan` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modal_peron` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))) NOT NULL,
	`peron_id` text NOT NULL,
	`tanggal` text NOT NULL,
	`jenis` text NOT NULL,
	`jumlah` real NOT NULL,
	`catatan` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`peron_id`) REFERENCES `peron`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pembelian` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))) NOT NULL,
	`tanggal` text NOT NULL,
	`peron_id` text NOT NULL,
	`catatan` text,
	`status_bayar` text DEFAULT 'belum' NOT NULL,
	`tanggal_bayar` text,
	`sumber_bayar` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`peron_id`) REFERENCES `peron`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pembelian_detail` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))) NOT NULL,
	`pembelian_id` text NOT NULL,
	`produk` text NOT NULL,
	`qty_kg` real NOT NULL,
	`harga_lapangan` real NOT NULL,
	`markup_peron` real NOT NULL,
	`harga_beli` real NOT NULL,
	`subtotal` real NOT NULL,
	`estimasi_laba` real NOT NULL,
	`selisih_jual_bga` real DEFAULT 120 NOT NULL,
	FOREIGN KEY (`pembelian_id`) REFERENCES `pembelian`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `penjualan` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))) NOT NULL,
	`tanggal` text NOT NULL,
	`no_bast` text,
	`no_invoice` text,
	`status_bayar` text DEFAULT 'belum' NOT NULL,
	`tanggal_bayar_bga` text,
	`catatan` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `penjualan_detail` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))) NOT NULL,
	`penjualan_id` text NOT NULL,
	`produk` text NOT NULL,
	`qty_kg` real NOT NULL,
	`harga_jual` real NOT NULL,
	`subtotal` real NOT NULL,
	FOREIGN KEY (`penjualan_id`) REFERENCES `penjualan`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `peron` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))) NOT NULL,
	`nama` text NOT NULL,
	`kontak` text,
	`alamat` text,
	`status` text DEFAULT 'aktif' NOT NULL,
	`markup_tbs_default` real DEFAULT 50 NOT NULL,
	`markup_brdl_default` real DEFAULT 50 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `transaksi_kas` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))) NOT NULL,
	`tanggal` text NOT NULL,
	`akun` text NOT NULL,
	`arah` text NOT NULL,
	`jumlah` real NOT NULL,
	`kategori` text NOT NULL,
	`ref_tabel` text,
	`ref_id` text,
	`transfer_grup` text,
	`catatan` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
