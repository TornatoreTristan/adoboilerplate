import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserService from '#users/services/user_service'
import type OrganizationService from '#organizations/services/organization_service'
import type OrganizationInvitationRepository from '#organizations/repositories/organization_invitation_repository'
import type AuthorizationService from '#roles/services/authorization_service'
import Role from '#roles/models/role'
import Permission from '#roles/models/permission'

/**
 * Regression coverage for the RBAC table never being populated: accepting an
 * invitation goes through `OrganizationInvitationsController.accept` ->
 * `OrganizationRepository.addUser`, which must now also create the matching
 * `organization_user_roles` row.
 */
test.group('OrganizationInvitationsController.accept — RBAC sync', (group) => {
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

  test('accepting an invitation grants the new member their role permissions', async ({
    client,
    assert,
  }) => {
    await seedRoleWithPermission('admin', 'billing.manage')
    await seedRoleWithPermission('member', 'billing.view')

    const userService = getService<UserService>(TYPES.UserService)
    const orgService = getService<OrganizationService>(TYPES.OrganizationService)
    const invitationRepo = getService<OrganizationInvitationRepository>(
      TYPES.OrganizationInvitationRepository
    )
    const authService = getService<AuthorizationService>(TYPES.AuthorizationService)

    const owner = await userService.create({
      email: `owner-${Date.now()}@example.com`,
      password: 'password123',
    })
    const organization = await orgService.create({ name: 'Invite Org' }, owner.id)

    const inviteeEmail = `invitee-${Date.now()}@example.com`
    const invitee = await userService.create({ email: inviteeEmail, password: 'password123' })

    const invitation = await invitationRepo.create({
      email: inviteeEmail,
      organizationId: organization.id,
      invitedById: owner.id,
      role: 'member',
      token: randomBytes(32).toString('hex'),
      expiresAt: DateTime.now().plus({ days: 7 }),
    })

    const login = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: inviteeEmail, password: 'password123' })

    await client
      .get(`/organizations/invitations/${invitation.token}/accept`)
      .withSession(login.session())
      .withCsrfToken()

    assert.isTrue(await authService.can(invitee.id, organization.id, 'billing.view'))
    assert.isFalse(await authService.can(invitee.id, organization.id, 'billing.manage'))
  })
})
