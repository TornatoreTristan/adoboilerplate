import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AuthorizationService from '#roles/services/authorization_service'
import Role from '#roles/models/role'
import Permission from '#roles/models/permission'
import User from '#users/models/user'
import Organization from '#organizations/models/organization'

/**
 * `AuthorizationService.syncRoleForTenancy` / `removeAllRoles` are the only
 * writers of `organization_user_roles` that a tenancy change (join, role
 * change, removal) should ever go through — this is the fix for the RBAC
 * table being permanently empty (nothing in `app/` ever wrote to it before).
 */
test.group('AuthorizationService — tenancy/RBAC sync', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function seedRoleWithPermission(slug: string, permissionSlug: string) {
    const permission = await Permission.firstOrCreate(
      { slug: permissionSlug },
      {
        name: permissionSlug,
        slug: permissionSlug,
        resource: permissionSlug.split('.')[0],
        action: permissionSlug.split('.')[1],
      }
    )
    const role = await Role.firstOrCreate({ slug }, { name: slug, slug, isSystem: true })
    await role.related('permissions').sync([permission.id])
    return role
  }

  test('maps owner and admin tenancy roles to the "admin" RBAC slug', async ({ assert }) => {
    await seedRoleWithPermission('admin', 'billing.manage')

    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)
    const user = await User.create({ email: 'owner@example.com', password: 'password123' })
    const org = await Organization.create({ name: 'Org', slug: `org-${Date.now()}` })

    await authService.syncRoleForTenancy(user.id, org.id, 'owner')

    assert.isTrue(await authService.can(user.id, org.id, 'billing.manage'))
  })

  test('maps member and viewer tenancy roles to their own RBAC slug', async ({ assert }) => {
    await seedRoleWithPermission('admin', 'billing.manage')
    await seedRoleWithPermission('member', 'billing.view')
    await seedRoleWithPermission('viewer', 'billing.view')

    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)
    const member = await User.create({ email: 'member@example.com', password: 'password123' })
    const org = await Organization.create({ name: 'Org', slug: `org-${Date.now()}` })

    await authService.syncRoleForTenancy(member.id, org.id, 'member')

    assert.isTrue(await authService.can(member.id, org.id, 'billing.view'))
    assert.isFalse(await authService.can(member.id, org.id, 'billing.manage'))
  })

  test('changing tenancy role replaces the RBAC role instead of accumulating it', async ({
    assert,
  }) => {
    await seedRoleWithPermission('admin', 'billing.manage')
    await seedRoleWithPermission('member', 'billing.view')

    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)
    const user = await User.create({ email: 'promoted@example.com', password: 'password123' })
    const org = await Organization.create({ name: 'Org', slug: `org-${Date.now()}` })

    await authService.syncRoleForTenancy(user.id, org.id, 'member')
    assert.isFalse(await authService.can(user.id, org.id, 'billing.manage'))

    await authService.syncRoleForTenancy(user.id, org.id, 'admin')

    assert.isTrue(await authService.can(user.id, org.id, 'billing.manage'))

    const rows = await db
      .from('organization_user_roles')
      .where('user_id', user.id)
      .where('organization_id', org.id)
    assert.lengthOf(rows, 1)
  })

  test('permission changes take effect immediately after a role change (cache invalidated)', async ({
    assert,
  }) => {
    await seedRoleWithPermission('admin', 'billing.manage')
    await seedRoleWithPermission('member', 'billing.view')

    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)
    const user = await User.create({ email: 'cached@example.com', password: 'password123' })
    const org = await Organization.create({ name: 'Org', slug: `org-${Date.now()}` })

    await authService.syncRoleForTenancy(user.id, org.id, 'member')

    // Warm up the 10-minute cache for the permission check.
    assert.isFalse(await authService.can(user.id, org.id, 'billing.manage'))

    await authService.syncRoleForTenancy(user.id, org.id, 'admin')

    // Without cache invalidation this would still read `false` from cache
    // for up to 10 minutes.
    assert.isTrue(await authService.can(user.id, org.id, 'billing.manage'))
  })

  test('removeAllRoles strips every RBAC role for the user in that organization', async ({
    assert,
  }) => {
    await seedRoleWithPermission('admin', 'billing.manage')

    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)
    const user = await User.create({ email: 'removed@example.com', password: 'password123' })
    const org = await Organization.create({ name: 'Org', slug: `org-${Date.now()}` })

    await authService.syncRoleForTenancy(user.id, org.id, 'admin')
    assert.isTrue(await authService.can(user.id, org.id, 'billing.manage'))

    await authService.removeAllRoles(user.id, org.id)

    assert.isFalse(await authService.can(user.id, org.id, 'billing.manage'))

    const rows = await db
      .from('organization_user_roles')
      .where('user_id', user.id)
      .where('organization_id', org.id)
    assert.lengthOf(rows, 0)
  })

  test('does not throw when the mapped RBAC slug is not seeded yet', async ({ assert }) => {
    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)
    const user = await User.create({ email: 'unseeded@example.com', password: 'password123' })
    const org = await Organization.create({ name: 'Org', slug: `org-${Date.now()}` })

    await authService.syncRoleForTenancy(user.id, org.id, 'owner')

    const rows = await db
      .from('organization_user_roles')
      .where('user_id', user.id)
      .where('organization_id', org.id)
    assert.lengthOf(rows, 0)
  })
})
