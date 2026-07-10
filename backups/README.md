# Database Backups

These .sql backup files are generated locally and transferred to the VPS.
They are NOT committed to git (gitignored).

## Generate backups (run after scrape-all completes):

```bash
# Data-only dump (for importing into existing tables on VPS):
docker exec ads-postgres pg_dump -U ads_user -d ads_supervisor --no-owner --data-only > backups/ads_data_backup.sql

# Full dump (schema + data, for fresh DB):
docker exec ads-postgres pg_dump -U ads_user -d ads_supervisor --no-owner > backups/ads_full_backup.sql
```

## Restore on VPS:

```bash
# If VPS has empty DB with schema already applied (via alembic):
psql -U ads_user -d ads_supervisor < ads_data_backup.sql

# If VPS has completely fresh/empty DB:
psql -U ads_user -d ads_supervisor < ads_full_backup.sql
```

## Verify:

```sql
SELECT count(*) FROM competitors;   -- expect 27
SELECT count(*) FROM ads;           -- expect 1600+
SELECT count(*) FROM ad_analyses;   -- expect 200+
```
