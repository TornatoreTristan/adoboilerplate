import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import type CacheService from '#shared/services/cache_service'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * Maps `user_organizations.role` (the multi-tenancy pivot role — owner /
 * admin / member / viewer, see `app/shared/types/organization.ts`) to the
 * RBAC role slug it must mirror in `organization_user_roles` (see
 * `database/seeders/role_permission_seeder.ts` for the seeded slugs). There
 * is no RBAC role called "owner": an owner is simply an admin for
 * permission-checking purposes.
 */
const TENANCY_ROLE_TO_RBAC_SLUG: Record<string, string> = {
  owner: 'admin',
  admin: 'admin',
  member: 'member',
  viewer: 'viewer',
}

@injectable()
export default class AuthorizationService {
  // RoleRepository / PermissionRepository are intentionally not injected here:
  // this service issues raw SQL against the user_roles / role_permissions
  // tables for performance and would just thread through the repos otherwise.
  constructor(@inject(TYPES.CacheService) private cache: CacheService) {}

  /**
   * Check if user has a specific role in an organization
   */
  async hasRole(userId: string, organizationId: string, roleSlug: string): Promise<boolean> {
    const cacheKey = `auth:role:${userId}:${organizationId}:${roleSlug}`

    return this.cache.remember(
      cacheKey,
      async () => {
        const result = await db
          .from('organization_user_roles')
          .join('roles', 'organization_user_roles.role_id', 'roles.id')
          .where('organization_user_roles.user_id', userId)
          .where('organization_user_roles.organization_id', organizationId)
          .where('roles.slug', roleSlug)
          .first()

        return !!result
      },
      { ttl: 600, tags: ['auth', `auth_user_${userId}`, `auth_org_${organizationId}`] }
    )
  }

  /**
   * Check if user has any of the specified roles in an organization
   */
  async hasAnyRole(userId: string, organizationId: string, roleSlugs: string[]): Promise<boolean> {
    const result = await db
      .from('organization_user_roles')
      .join('roles', 'organization_user_roles.role_id', 'roles.id')
      .where('organization_user_roles.user_id', userId)
      .where('organization_user_roles.organization_id', organizationId)
      .whereIn('roles.slug', roleSlugs)
      .first()

    return !!result
  }

  /**
   * Check if user has all specified roles in an organization
   */
  async hasAllRoles(userId: string, organizationId: string, roleSlugs: string[]): Promise<boolean> {
    const count = await db
      .from('organization_user_roles')
      .join('roles', 'organization_user_roles.role_id', 'roles.id')
      .where('organization_user_roles.user_id', userId)
      .where('organization_user_roles.organization_id', organizationId)
      .whereIn('roles.slug', roleSlugs)
      .count('* as total')
      .first()

    return count?.total === roleSlugs.length
  }

  /**
   * Check if user has a specific permission in an organization
   * Checks both direct permissions and role-based permissions
   */
  async can(userId: string, organizationId: string, permissionSlug: string): Promise<boolean> {
    const cacheKey = `auth:permission:${userId}:${organizationId}:${permissionSlug}`

    return this.cache.remember(
      cacheKey,
      async () => {
        // Check direct permissions
        const directPermission = await db
          .from('user_permissions')
          .join('permissions', 'user_permissions.permission_id', 'permissions.id')
          .where('user_permissions.user_id', userId)
          .where('user_permissions.organization_id', organizationId)
          .where('permissions.slug', permissionSlug)
          .first()

        if (directPermission) {
          return true
        }

        // Check role-based permissions
        const rolePermission = await db
          .from('organization_user_roles')
          .join('role_permissions', 'organization_user_roles.role_id', 'role_permissions.role_id')
          .join('permissions', 'role_permissions.permission_id', 'permissions.id')
          .where('organization_user_roles.user_id', userId)
          .where('organization_user_roles.organization_id', organizationId)
          .where('permissions.slug', permissionSlug)
          .first()

        return !!rolePermission
      },
      { ttl: 600, tags: ['auth', `auth_user_${userId}`, `auth_org_${organizationId}`] }
    )
  }

  /**
   * Check if user has any of the specified permissions
   */
  async canAny(
    userId: string,
    organizationId: string,
    permissionSlugs: string[]
  ): Promise<boolean> {
    for (const slug of permissionSlugs) {
      if (await this.can(userId, organizationId, slug)) {
        return true
      }
    }
    return false
  }

  /**
   * Check if user has all specified permissions
   */
  async canAll(
    userId: string,
    organizationId: string,
    permissionSlugs: string[]
  ): Promise<boolean> {
    for (const slug of permissionSlugs) {
      if (!(await this.can(userId, organizationId, slug))) {
        return false
      }
    }
    return true
  }

  /**
   * Get all user roles in an organization
   */
  async getUserRoles(userId: string, organizationId: string) {
    return db
      .from('organization_user_roles')
      .join('roles', 'organization_user_roles.role_id', 'roles.id')
      .where('organization_user_roles.user_id', userId)
      .where('organization_user_roles.organization_id', organizationId)
      .select('roles.*')
  }

  /**
   * Get all user permissions in an organization (direct + role-based)
   */
  async getUserPermissions(userId: string, organizationId: string) {
    // Get direct permissions
    const directPermissions = await db
      .from('user_permissions')
      .join('permissions', 'user_permissions.permission_id', 'permissions.id')
      .where('user_permissions.user_id', userId)
      .where('user_permissions.organization_id', organizationId)
      .select('permissions.*')

    // Get role-based permissions
    const rolePermissions = await db
      .from('organization_user_roles')
      .join('role_permissions', 'organization_user_roles.role_id', 'role_permissions.role_id')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .where('organization_user_roles.user_id', userId)
      .where('organization_user_roles.organization_id', organizationId)
      .select('permissions.*')

    // Merge and deduplicate by id
    const allPermissions = [...directPermissions, ...rolePermissions]
    const uniquePermissions = Array.from(new Map(allPermissions.map((p) => [p.id, p])).values())

    return uniquePermissions
  }

  /**
   * Assign role to user in organization
   */
  async assignRole(userId: string, organizationId: string, roleId: string): Promise<void> {
    await db.table('organization_user_roles').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      organization_id: organizationId,
      role_id: roleId,
      created_at: new Date(),
    })

    // Invalider les caches d'autorisation pour cet utilisateur
    await this.cache?.invalidateTags(['auth', `auth_user_${userId}`, `auth_org_${organizationId}`])
  }

  /**
   * Remove role from user in organization
   */
  async removeRole(userId: string, organizationId: string, roleId: string): Promise<void> {
    await db
      .from('organization_user_roles')
      .where('user_id', userId)
      .where('organization_id', organizationId)
      .where('role_id', roleId)
      .delete()

    // Invalider les caches d'autorisation pour cet utilisateur
    await this.cache?.invalidateTags(['auth', `auth_user_${userId}`, `auth_org_${organizationId}`])
  }

  /**
   * Keep the RBAC role (`organization_user_roles`) in sync with the
   * multi-tenancy pivot role (`user_organizations.role`). This is the single
   * place that translates a tenancy role into the RBAC slug it maps to (see
   * `TENANCY_ROLE_TO_RBAC_SLUG`) — callers (repositories, controllers,
   * services) must never write to `organization_user_roles` directly to
   * reflect a tenancy role change, or the two notions of role will drift
   * apart again.
   *
   * Replaces any existing RBAC role assignment for this user/organization so
   * a user only ever carries the RBAC role matching their current tenancy
   * role (no stale roles left behind after a promotion/demotion).
   *
   * Pass `trx` to run inside an existing transaction — e.g. organization
   * creation, where the owner's RBAC row must be created atomically with the
   * `user_organizations` row, so a partial failure can never leave an
   * organization without an authorized owner.
   *
   * No-ops (does not throw) if the mapped RBAC role slug isn't seeded yet —
   * a tenancy write should never fail because the RBAC tables are empty.
   */
  async syncRoleForTenancy(
    userId: string,
    organizationId: string,
    tenancyRole: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    const client = trx ?? db
    const rbacSlug = TENANCY_ROLE_TO_RBAC_SLUG[tenancyRole] ?? tenancyRole

    const role = await client.from('roles').where('slug', rbacSlug).first()

    if (!role) {
      return
    }

    await client
      .from('organization_user_roles')
      .where('user_id', userId)
      .where('organization_id', organizationId)
      .delete()

    await client.table('organization_user_roles').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      organization_id: organizationId,
      role_id: role.id,
      created_at: new Date(),
    })

    await this.cache?.invalidateTags(['auth', `auth_user_${userId}`, `auth_org_${organizationId}`])
  }

  /**
   * Remove every RBAC role assigned to a user in an organization. Called
   * whenever a user leaves an organization's tenancy (member removed,
   * account deleted via GDPR, ...) so they don't keep permissions on an
   * organization they're no longer part of.
   */
  async removeAllRoles(
    userId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    const client = trx ?? db

    await client
      .from('organization_user_roles')
      .where('user_id', userId)
      .where('organization_id', organizationId)
      .delete()

    await this.cache?.invalidateTags(['auth', `auth_user_${userId}`, `auth_org_${organizationId}`])
  }

  /**
   * Assign direct permission to user in organization
   */
  async grantPermission(
    userId: string,
    organizationId: string,
    permissionId: string
  ): Promise<void> {
    await db.table('user_permissions').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      organization_id: organizationId,
      permission_id: permissionId,
      created_at: new Date(),
    })

    // Invalider les caches d'autorisation pour cet utilisateur
    await this.cache?.invalidateTags(['auth', `auth_user_${userId}`, `auth_org_${organizationId}`])
  }

  /**
   * Remove direct permission from user in organization
   */
  async revokePermission(
    userId: string,
    organizationId: string,
    permissionId: string
  ): Promise<void> {
    await db
      .from('user_permissions')
      .where('user_id', userId)
      .where('organization_id', organizationId)
      .where('permission_id', permissionId)
      .delete()

    // Invalider les caches d'autorisation pour cet utilisateur
    await this.cache?.invalidateTags(['auth', `auth_user_${userId}`, `auth_org_${organizationId}`])
  }
}
