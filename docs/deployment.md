# Deployment guide

Coolify-friendly checklist for taking the boilerplate to production.

## Process layout

The app expects **two long-running processes** sharing the same code +
DB + Redis:

| Service | Command            | Purpose                                                   |
| ------- | ------------------ | --------------------------------------------------------- |
| `web`   | `npm run start`    | HTTP server (Inertia + JSON API)                          |
| `worker`| `npm run worker`   | Bull queue consumer (emails, async events, scheduled jobs)|

A separate worker matters because:

- The HTTP process should never block on a slow email send.
- A crash in the worker shouldn't 500 every request.
- Coolify (or whatever orchestrator) can scale them independently.

In Coolify, declare both as separate services pointing at the same
image; in pm2 it's `pm2 start ecosystem.config.cjs` with two apps.

## One-shot pre-deploy gate

```bash
npm run check     # typecheck + lint + tests
```

Wire this into Coolify's "build command" or your CI before the image
is shipped. With 0 errors expected, any failure here is a regression.

## Database migrations

Run after every deploy:

```bash
node ace migration:run --force
```

### Two migrations need attention on first deploy

These migrations were modified after their initial version was
created — if you deployed an earlier copy of the boilerplate, they
have already been recorded as `completed` in `adonis_schema` and
**won't re-run**. Drop and re-create the affected tables manually
(or rollback + re-run) so the schema reflects the new shape:

#### 1. `1760648543475_create_subscriptions_table.ts`

Change: the `status` enum gained `paused` and `unpaid`. Without this
update, `customer.subscription.updated` webhooks crash when Stripe
sends one of those statuses.

```bash
# In a maintenance window, with no live writes to subscriptions:
node ace migration:rollback --batch=N    # find N from migration:status
node ace migration:run --force
```

#### 2. `1762000000000_add_two_factor_to_users_table.ts`

Adds `two_factor_secret`, `two_factor_enabled`,
`two_factor_backup_codes`, `two_factor_confirmed_at` to `users`.
This is a brand-new migration — `migration:run` picks it up
automatically.

## Required env vars in production

Beyond the AdonisJS defaults (`APP_KEY`, DB creds, etc.), make sure
these are set:

| Var                            | Why                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `STRIPE_SECRET_KEY`            | Billing — webhook handler will throw 500 without it.                                                               |
| `STRIPE_WEBHOOK_SECRET`        | Required to verify webhook signatures.                                                                             |
| `CLAMAV_ENABLED=true`          | Run a ClamAV daemon next to the app and point `CLAMAV_HOST/PORT` at it.                                            |
| `CLAMAV_REQUIRED=true`         | Fail uploads closed when ClamAV is unreachable. Set this in prod, leave `false` in dev.                            |
| `PWNED_PASSWORD_CHECK_ENABLED=true` | Hits the HIBP range API at signup / reset. Service falls open on outages so it never blocks new signups.       |
| `HEALTH_CHECK_TOKEN`           | Strongly recommended in prod — otherwise `/health/ready` is open. Pass it as `?token=…` from the load balancer.    |
| `SENTRY_DSN`                   | Optional but every error stops at the boundary if not set.                                                         |
| `CORS_ALLOWED_ORIGINS`         | Set to your production origin(s). Empty array fails closed; `*` would let any site call your API with credentials. |

## Reverse-proxy & TLS

`config/shield.ts` already enables HSTS for 365 days with subdomains.
The `secure` cookie flag is gated on `NODE_ENV=production`, so:

- Make sure `NODE_ENV=production` is set in the running env.
- Terminate TLS at the proxy (Coolify defaults to Traefik with Let's
  Encrypt). Forward the `X-Forwarded-Proto` header so AdonisJS marks
  the connection as TLS for cookie scoping.

## Backups

This boilerplate doesn't ship a backup workflow. At minimum:

- **Postgres**: nightly `pg_dump` to off-host storage (S3, B2, …).
  Test the restore path quarterly.
- **Redis**: rate-limit / cache state is rebuildable. The Bull
  dead-letter queues are not — back up the Redis volume too.
- **Storage**: if `UPLOADS_DISK=local`, mount the `storage/`
  directory on a persistent volume and back it up. With `s3`, rely
  on the bucket's versioning / cross-region replication.

## Health checks

| Endpoint        | Purpose                                                          |
| --------------- | ---------------------------------------------------------------- |
| `/health/live`  | Process is alive — wire to Coolify's healthcheck.                |
| `/health/ready` | Dependencies (DB, Redis, ClamAV) are reachable. Token-protected. |

Configure the Coolify healthcheck against `/health/live` — `/ready`
is heavier and intended for the load balancer, not the orchestrator.
