import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserService from '#users/services/user_service'
import type OrganizationService from '#organizations/services/organization_service'
import Role from '#roles/models/role'
import Permission from '#roles/models/permission'

/**
 * End-to-end regression test for the bug this fix addresses:
 * `organization_user_roles` (the table `PermissionMiddleware` reads) was
 * never populated by anything under `app/`, so `middleware.permission([...])`
 * refused every request, everywhere, regardless of tenancy role.
 *
 * Ce test n'appelle volontairement PAS `AuthorizationService.assignRole`
 * à la main — it only goes through the real
 * organization membership flow (`OrganizationService.create` /
 * `OrganizationService.addUser`), exactly as a real signup/invite would. If
 * the RBAC sync regresses, this is the test that catches it.
 */
test.group('Organization membership -> RBAC wiring (end-to-end)', (group) => {
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

  test('an organization owner reaches a billing.manage route (200), a plain member is refused (403)', async ({
    client,
  }) => {
    // Comme database/seeders/role_permission_seeder.ts : seul « admin »
    // reçoit billing.manage, « member » ne l'a pas.
    await seedRoleWithPermission('admin', 'billing.manage')
    await Role.firstOrCreate({ slug: 'member' }, { name: 'member', slug: 'member', isSystem: true })

    const userService = getService<UserService>(TYPES.UserService)
    const orgService = getService<OrganizationService>(TYPES.OrganizationService)

    const owner = await userService.create({
      email: `owner-${Date.now()}@example.com`,
      password: 'password123',
    })
    const organization = await orgService.create({ name: 'E2E RBAC Org' }, owner.id)

    const member = await userService.create({
      email: `member-${Date.now()}@example.com`,
      password: 'password123',
    })
    await orgService.addUser(organization.id, member.id, 'member')

    const ownerLogin = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: owner.email, password: 'password123' })

    const ownerResponse = await client
      .get('/debug/permission-protected')
      .withSession(ownerLogin.session())
      .withCsrfToken()
      .header('accept', 'application/json')

    ownerResponse.assertStatus(200)

    const memberLogin = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: member.email, password: 'password123' })

    const memberResponse = await client
      .get('/debug/permission-protected')
      .withSession(memberLogin.session())
      .withCsrfToken()
      .header('accept', 'application/json')

    memberResponse.assertStatus(403)
  })
})
