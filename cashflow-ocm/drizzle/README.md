# ⚠️ Folder drizzle/ ini VESTIGIAL — BUKAN sumber kebenaran skema

Workflow migrasi proyek ini **bukan** `drizzle-kit migrate`. Skema dievolusi lewat:

1. **`lib/db/schema.ts`** = sumber kebenaran tipe/kolom.
2. **`scripts/add-*.ts`** = migrasi additif idempotent (`ALTER TABLE ... ADD COLUMN`),
   dijalankan di `vercel-build` saat deploy.
3. **`drizzle-kit push`** (`npm run db:push`) untuk sinkronisasi awal/manual.

File `*.sql` + `meta/` di folder ini adalah artefak `drizzle-kit generate` yang
**BASI & TIDAK KONSISTEN** (mis. `_journal.json` hanya mencatat 2 entri padahal ada
4 file SQL; `0000_woozy_pride.sql` masih menulis kolom uang sebagai `real`).

## JANGAN ambil kesimpulan tipe kolom dari file di sini

DB **live** sudah benar (diverifikasi 22 Jun 2026 via `PRAGMA table_info`):
**kolom uang = `integer`**, `tonase`/`qty_kg` = `real`. Cocok dengan `schema.ts`.

Audit 2026-06-22 sempat menandai "drift tipe real→integer" (R4) karena membaca
`0000_woozy_pride.sql` — itu **FALSE ALARM**. Untuk memeriksa tipe sebenarnya,
selalu `PRAGMA table_info(<tabel>)` pada DB live, bukan baca SQL di folder ini.

Jangan jalankan `drizzle-kit migrate` terhadap DB produksi tanpa me-rebaseline
folder ini lebih dulu (migrasi basi bisa bentrok dengan skema live).
