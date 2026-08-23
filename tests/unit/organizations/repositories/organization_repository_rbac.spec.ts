import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type OrganizationRepository from '#organizations/repositories/organization_repository'
import type AuthorizationService from '#roles/services/authorization_service'
import Organization from '#organizations/models/organization'
import User from '#users/models/user'
import Role from '#roles/models/role'
import Permission from '#roles/models/permission'

/**
 * Regression coverage: `OrganizationRepository.updateUserRole` /
 * `removeUser` must keep `organization_user_roles` (RBAC) in sync with
 * `user_organizations.role` (tenancy) — otherwise a promoted member waits
 * out the 10-minute cache TTL, and a removed member keeps their old
 * permissions forever.
 */
test.group('OrganizationRepository — RBAC sync', (group) => {
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

  test('updateUserRole changes permissions immediately (cache invalidated)', async ({ assert }) => {
    await seedRoleWithPermission('admin', 'billing.manage')
    await seedRoleWithPermission('member', 'billing.view')

    const repository = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)

    const user = await User.create({ email: 'promoted@example.com', password: 'password123' })
    const org = await Organization.create({ name: 'Org', slug: `org-${Date.now()}` })

    await repository.addUser(org.id, user.id, 'member')
    assert.isFalse(await authService.can(user.id, org.id, 'billing.manage'))

    await repository.updateUserRole(org.id, user.id, 'admin')

    assert.isTrue(await authService.can(user.id, org.id, 'billing.manage'))
  })

  test('removeUser strips RBAC permissions along with the tenancy row', async ({ assert }) => {
    await seedRoleWithPermission('admin', 'billing.manage')

    const repository = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)

    const user = await User.create({ email: 'leaving@example.com', password: 'password123' })
    const org = await Organization.create({ name: 'Org', slug: `org-${Date.now()}` })

    await repository.addUser(org.id, user.id, 'admin')
    assert.isTrue(await authService.can(user.id, org.id, 'billing.manage'))

    await repository.removeUser(org.id, user.id)

    assert.isFalse(await authService.can(user.id, org.id, 'billing.manage'))
  })

  test('createWithOwner creates the owner RBAC role atomically with the tenancy row', async ({
    assert,
  }) => {
    await seedRoleWithPermission('admin', 'billing.manage')

    const repository = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)

    const owner = await User.create({ email: 'atomic-owner@example.com', password: 'password123' })

    const org = await repository.createWithOwner({ name: 'Atomic Org' }, owner.id)

    assert.isTrue(await authService.can(owner.id, org.id, 'billing.manage'))
  })
})
