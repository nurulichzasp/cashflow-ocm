CREATE TABLE `pembelian_foto` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))) NOT NULL,
	`pembelian_id` text NOT NULL REFERENCES `pembelian`(`id`) ON DELETE CASCADE,
	`url` text NOT NULL,
	`keterangan` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE `biaya_foto` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))) NOT NULL,
	`biaya_id` text NOT NULL REFERENCES `biaya_operasional`(`id`) ON DELETE CASCADE,
	`url` text NOT NULL,
	`keterangan` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch())
);
