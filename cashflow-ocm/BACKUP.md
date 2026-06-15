# Database Backup System

Sistem backup otomatis untuk database Cashflow CV OCM.

## Manual Backup

### Via API (Owner Only)

```bash
# Download backup as Excel
curl https://cashflow-ocm.vercel.app/api/backup \
  -H "Authorization: Bearer <session-token>" \
  -o backup.xlsx

# Download backup as JSON
curl https://cashflow-ocm.vercel.app/api/backup?format=json \
  -H "Authorization: Bearer <session-token>" \
  -o backup.json
```

### Features

- **Full Database Export (backup v2.0)**: Semua tabel data diekspor — akun_kas, peron, pembelian, penjualan, biaya_operasional, transaksi_kas, modal_peron, activity_log, **pembelian_detail, penjualan_detail, pembelian_foto, biaya_foto, harga_acuan, ppn_bulanan, pph_bulanan, app_settings**. (Tabel auth user/account/session SENGAJA tidak disertakan agar login tak ikut tertimpa saat restore.)
- **Summary Statistics**: Total records per table included in backup
- **Multiple Formats**: Excel (.xlsx) or JSON
- **Audit Logging**: All backup operations logged to activity_log
- **Owner Only**: Only owner role can trigger backups

## Automated Scheduled Backups

### Setup with External Cron Service

1. **Set environment variable** (add to `.env.production`):
   ```
   BACKUP_TOKEN=your-secure-random-token
   ```

2. **Use any cron service** (e.g., EasyCron, cron-job.org, or AWS CloudWatch).
   Kirim token lewat header `Authorization` (jangan di query string):
   ```
   POST https://cashflow-ocm.vercel.app/api/backup
   Header: Authorization: Bearer your-secure-random-token
   ```

3. **Schedule** (recommended):
   - Daily: `0 2 * * *` (2 AM every day)
   - Weekly: `0 2 * * 0` (2 AM every Sunday)

### Response Format

```json
{
  "success": true,
  "message": "Backup created successfully",
  "metadata": {
    "timestamp": "2026-06-06T10:30:00.000Z",
    "size": 1024000,
    "url": "https://<...>.blob.vercel-storage.com/backup-2026-06-06-103000.json",
    "pathname": "backup-2026-06-06-103000.json",
    "summary": {
      "totalPembelian": 45,
      "totalPenjualan": 38,
      "totalBiaya": 120,
      "totalTransaksi": 450,
      "totalAkun": 5,
      "totalPeron": 16
    }
  }
}
```

## Backup Content

Each backup includes:

### Summary Sheet
- Backup timestamp
- Database version
- Record counts per table

### Data Sheets
1. **akun_kas** - Bank accounts and cash
2. **peron** - Supplier/contractor information
3. **pembelian** - Purchase transactions (header)
4. **penjualan** - Sales transactions (header)
5. **biaya_operasional** - Operating expenses
6. **transaksi_kas** - Cash flow transactions
7. **modal_peron** - Supplier capital/debt
8. **activity_log** - Audit trail
9. **pembelian_detail** - Purchase line items (per TID/replas)
10. **penjualan_detail** - Sales line items
11. **pembelian_foto** / **biaya_foto** - Photo evidence references
12. **harga_acuan** - Reference prices
13. **ppn_bulanan** / **pph_bulanan** - Monthly tax records
14. **app_settings** - Company profile, tax rates, modal awal

## Best Practices

1. **Regular Backups**: Set up daily or weekly automated backups
2. **Secure Token**: Use a strong, unique backup token
3. **Storage**: Keep backups in multiple locations (cloud storage, local, external drive)
4. **Test Restores**: Periodically test backup files can be read/imported
5. **Monitoring**: Monitor backup completion via logs

## Restore Procedure

> ⚠️ Restore = operasi PALING berbahaya (menimpa data hidup). WAJIB diuji ke DB cabang (Turso branch) dulu — JANGAN langsung ke produksi.

### Primer (paling andal): Turso native PITR / dump–restore
Database asli direstore dengan tipe data persis — ini jalur pemulihan utama untuk bencana (DB rusak / terhapus / salah hapus massal).

1. Buat DB cabang dari titik waktu sebelum insiden, lalu verifikasi isinya:
   ```bash
   turso db create cashflow-restore --from-db <nama-db> --timestamp <ISO8601>
   turso db shell cashflow-restore "SELECT count(*) FROM pembelian;"
   ```
2. Setelah yakin, arahkan app ke DB hasil restore (ganti `TURSO_CONNECTION_URL`) atau promosikan.

Alternatif: `turso db dump <nama-db> > dump.sql` lalu `turso db shell <target> < dump.sql`.

### Sekunder (portabel): backup JSON v2.0 dari `/api/backup`
Sejak v2.0 backup ini LENGKAP (16 tabel; lihat daftar di atas — tabel auth sengaja tidak disertakan). Cocok untuk arsip portabel, inspeksi, atau impor manual per-tabel ke tools DB.

### Kenapa TIDAK ada tombol/endpoint restore-otomatis (disengaja)
Wipe-and-reinsert seluruh DB lewat satu klik berisiko tinggi dan rawan jebakan serialisasi (kolom `timestamp` jadi ISO string di JSON, kolom tanggal yang memang teks tidak boleh dikonversi). Jalur restore yang bisa diandalkan adalah Turso PITR di atas. Jika kelak butuh restore terprogram dari JSON, bangun script khusus yang mengonversi kolom timestamp dengan benar dan **uji ke Turso branch dulu** sebelum dipakai produksi.

## Troubleshooting

### Backup Fails with Timeout
- Database is too large - increase `maxDuration` in `app/api/backup/route.ts`
- Check network connection

### Backup Token Not Working
- Verify `BACKUP_TOKEN` environment variable is set correctly
- Ensure token matches between cron service and environment

### Large Backup Files
- Excel format is more compact than JSON
- Consider archiving old backups (tar.gz, zip)

## Integration with Cloud Storage

For production, consider uploading backups to:

- **Vercel Blob**: Using `@vercel/blob`
- **AWS S3**: Using AWS SDK
- **Google Cloud Storage**: Using @google-cloud/storage
- **Dropbox/OneDrive**: Using respective APIs

Example (future enhancement):

```typescript
// Upload to Vercel Blob
const { url } = await put(`backup-${timestamp}.xlsx`, blob, {
  access: 'private',
});
```
