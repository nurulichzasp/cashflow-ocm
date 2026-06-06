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

- **Full Database Export**: All tables exported (akun_kas, peron, pembelian, penjualan, biaya_operasional, transaksi_kas, modal_peron, activity_log)
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

2. **Use any cron service** (e.g., EasyCron, cron-job.org, or AWS CloudWatch):
   ```
   POST https://cashflow-ocm.vercel.app/api/backup?token=your-secure-random-token
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
    "format": "xlsx",
    "size": 1024000,
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
3. **pembelian** - Purchase transactions
4. **penjualan** - Sales transactions
5. **biaya_operasional** - Operating expenses
6. **transaksi_kas** - Cash flow transactions
7. **modal_peron** - Supplier capital/debt
8. **activity_log** - Audit trail

## Best Practices

1. **Regular Backups**: Set up daily or weekly automated backups
2. **Secure Token**: Use a strong, unique backup token
3. **Storage**: Keep backups in multiple locations (cloud storage, local, external drive)
4. **Test Restores**: Periodically test backup files can be read/imported
5. **Monitoring**: Monitor backup completion via logs

## Restore Procedure

To restore from backup:

1. Open backup Excel file
2. Copy data from each sheet
3. Import into database using appropriate tools
4. Or manually re-enter critical transactions if needed

For full database restoration, consider using database-specific backup tools (SQL dump, database export from Turso).

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
