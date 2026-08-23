import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Data migration: backfill `organization_user_roles` from the existing
 * `user_organizations` rows.
 *
 * Until this fix, nothing in `app/` ever wrote to `organization_user_roles`
 * (see `app/roles/services/authorization_service.ts`), even though it is the
 * table `PermissionMiddleware` / `RoleMiddleware` actually check. Every
 * organization membership created before the fix therefore has no matching
 * RBAC role, and any route behind `middleware.permission([...])` refuses
 * every member — including owners.
 *
 * This inserts one RBAC row per `user_organizations` row, mapping the
 * tenancy role to the RBAC slug it corresponds to (see
 * `AuthorizationService.syncRoleForTenancy` for the same mapping used going
 * forward at write time):
 *
 *   owner  -> admin
 *   admin  -> admin
 *   member -> member
 *   viewer -> viewer
 *
 * Idempotent: `ON CONFLICT (user_id, organization_id, role_id) DO NOTHING`
 * so re-running this migration (or running it after a manual catch-up
 * already applied on an environment) is a no-op rather than an error.
 *
 * Silently skips rows whose mapped RBAC slug isn't seeded yet (no matching
 * row in `roles`) — the JOIN simply won't produce a row for them. Run
 * `database/seeders/role_permission_seeder.ts` first in environments where
 * `roles` hasn't been seeded.
 */
export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db.rawQuery(`
        INSERT INTO organization_user_roles (id, user_id, organization_id, role_id, created_at)
        SELECT gen_random_uuid(), uo.user_id, uo.organization_id, r.id, now()
        FROM user_organizations uo
        JOIN roles r ON r.slug = CASE uo.role
          WHEN 'owner' THEN 'admin'
          WHEN 'admin' THEN 'admin'
          WHEN 'member' THEN 'member'
          WHEN 'viewer' THEN 'viewer'
          ELSE uo.role
        END
        ON CONFLICT (user_id, organization_id, role_id) DO NOTHING
      `)
    })
  }

  async down() {
    // Rollback intentionally does nothing: this is a data backfill, not a
    // schema change, and reverting it would strip RBAC roles from real
    // memberships that may have been created (via the app, not this
    // migration) since it ran.
  }
}
