import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type OrganizationService from '#organizations/services/organization_service'
import type UserService from '#users/services/user_service'
import type AuthorizationService from '#roles/services/authorization_service'
import Role from '#roles/models/role'
import Permission from '#roles/models/permission'

/**
 * Regression coverage for the bug where `organization_user_roles` was never
 * populated: creating an organization or adding a member through
 * `OrganizationService` must leave the caller with the RBAC permissions
 * their tenancy role grants, not just a `user_organizations` row.
 */
test.group('OrganizationService — RBAC sync on membership changes', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function seedRoleWithPermissions(slug: string, permissionSlugs: string[]) {
    const permissions = await Promise.all(
      permissionSlugs.map((permissionSlug) =>
        Permission.firstOrCreate(
          { slug: permissionSlug },
          {
            name: permissionSlug,
            slug: permissionSlug,
            resource: permissionSlug.split('.')[0],
            action: permissionSlug.split('.')[1],
          }
        )
      )
    )
    const role = await Role.firstOrCreate({ slug }, { name: slug, slug, isSystem: true })
    await role.related('permissions').sync(permissions.map((p) => p.id))
    return role
  }

  test('creating an organization grants the owner billing.manage via AuthorizationService.can()', async ({
    assert,
  }) => {
    await seedRoleWithPermissions('admin', ['billing.manage', 'billing.view'])
    await seedRoleWithPermissions('member', ['billing.view'])

    const userService = getService<UserService>(TYPES.UserService)
    const orgService = getService<OrganizationService>(TYPES.OrganizationService)
    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)

    const owner = await userService.create({
      email: `owner-${Date.now()}@example.com`,
      password: 'password123',
    })

    const organization = await orgService.create({ name: 'RBAC Org' }, owner.id)

    assert.isTrue(await authService.can(owner.id, organization.id, 'billing.manage'))
  })

  test('adding a member grants member-level permissions, not admin-level ones', async ({
    assert,
  }) => {
    await seedRoleWithPermissions('admin', ['billing.manage', 'billing.view'])
    await seedRoleWithPermissions('member', ['billing.view'])

    const userService = getService<UserService>(TYPES.UserService)
    const orgService = getService<OrganizationService>(TYPES.OrganizationService)
    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)

    const owner = await userService.create({
      email: `owner-${Date.now()}@example.com`,
      password: 'password123',
    })
    const member = await userService.create({
      email: `member-${Date.now()}@example.com`,
      password: 'password123',
    })

    const organization = await orgService.create({ name: 'RBAC Org' }, owner.id)
    await orgService.addUser(organization.id, member.id, 'member')

    assert.isTrue(await authService.can(member.id, organization.id, 'billing.view'))
    assert.isFalse(await authService.can(member.id, organization.id, 'billing.manage'))
  })
})
