# Database Backup & Recovery Procedure

## Google Cloud SQL Automated Backups
Cloud SQL Developer Edition and Production tiers provide automated continuous write-ahead logging (WAL) and daily snapshot backups.

## Manual On-Demand Backup
To initiate an immediate point-in-time snapshot before running significant migrations:
```bash
gcloud sql backups create --instance=ai-studio-a5f89866 --project=abstract-patrol-23kqt
```

## Restoration Procedure
In the event of accidental data corruption:
1. List available backup identifiers:
   ```bash
   gcloud sql backups list --instance=ai-studio-a5f89866
   ```
2. Restore to desired point-in-time:
   ```bash
   gcloud sql backups restore BACKUP_ID --restore-instance=ai-studio-a5f89866
   ```
3. Run schema sanity verification:
   `SELECT count(*) FROM users;`
