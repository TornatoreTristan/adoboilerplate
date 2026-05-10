# Scheduled Tasks (Cron)

This page lists the recurring maintenance commands to schedule in production.

## Audit log purge

Removes audit logs older than `AUDIT_LOG_RETENTION_DAYS` (default: 90 days).

```bash
# Purge audit logs nightly (in your cron / Coolify scheduled task):
0 3 * * * cd /app && node ace audit:purge
```

### Options

| Flag        | Description                                                          |
| ----------- | -------------------------------------------------------------------- |
| `--days=N`  | Override the retention period for this run only                      |
| `--dry-run` | Print the number of rows that would be deleted without deleting them |

### Dry-run before first deploy

```bash
node ace audit:purge --dry-run
```

### Environment variable

Set `AUDIT_LOG_RETENTION_DAYS` in your `.env` (or Coolify environment config) to control the default retention period without touching the cron line:

```
AUDIT_LOG_RETENTION_DAYS=90
```
