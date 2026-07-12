# Arsip skrip one-off (SUDAH diterapkan ke prod)

Skrip di folder ini adalah migrasi/one-off yang **sudah dijalankan** ke Turso
produksi dan **tidak boleh dijalankan ulang** tanpa alasan kuat (semuanya
idempoten `IF NOT EXISTS`, tapi tetap: tak ada yang mereferensikannya lagi).

Yang masih AKTIF ada di `scripts/` induk:
- `add-*.ts` yang di-wire ke `vercel-build` (package.json) — jalan tiap deploy.
- `seed.ts` (`npm run db:seed`), `check-db.ts`, `reset-password.ts`,
  `verify-password.ts`, `gen-pwa-icons.cjs` — utilitas dev.
