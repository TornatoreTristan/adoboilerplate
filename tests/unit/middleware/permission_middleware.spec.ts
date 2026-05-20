import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import PermissionMiddleware from '#middleware/permission_middleware'
import Role from '#roles/models/role'
import Permission from '#roles/models/permission'
import User from '#users/models/user'
import Organization from '#organizations/models/organization'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AuthorizationService from '#roles/services/authorization_service'
import {
  AuthenticationException,
  AuthorizationException,
} from '#shared/exceptions/domain_exceptions'

function buildCtx(overrides: { userId?: string | null; organizationId?: string | null } = {}) {
  return {
    session: { get: (key: string) => (key === 'user_id' ? (overrides.userId ?? null) : null) },
    organization: overrides.organizationId ? { id: overrides.organizationId } : undefined,
  } as any
}

test.group('PermissionMiddleware - input validation', () => {
  test('throws AuthenticationException without user_id in session', async ({ assert }) => {
    const middleware = new PermissionMiddleware(['users.view'])
    await assert.rejects(
      () => middleware.handle(buildCtx(), async () => {}),
      AuthenticationException
    )
  })

  test('throws AuthorizationException without organization context', async ({ assert }) => {
    const middleware = new PermissionMiddleware(['users.view'])
    await assert.rejects(
      () => middleware.handle(buildCtx({ userId: 'user-1' }), async () => {}),
      AuthorizationException
    )
  })
})

test.group('PermissionMiddleware - authorization decision', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('lets users with the required permission through', async ({ assert }) => {
    const user = await User.create({ email: 'perm@example.com', password: 'password123' })
    const org = await Organization.create({
      name: 'Org',
      slug: `org-${Date.now()}`,
    })
    const role = await Role.create({
      name: 'EditorRole',
      slug: `editor-${Date.now()}`,
      isSystem: false,
    })
    const permission = await Permission.create({
      name: 'View users',
      slug: 'users.view',
      resource: 'users',
      action: 'view',
    })
    await role.related('permissions').attach([permission.id])

    const auth = getService<AuthorizationService>(TYPES.AuthorizationService)
    await auth.assignRole(user.id, org.id, role.id)

    let nextCalled = false
    const middleware = new PermissionMiddleware(['users.view'])
    await middleware.handle(buildCtx({ userId: user.id, organizationId: org.id }), async () => {
      nextCalled = true
    })

    assert.isTrue(nextCalled)
  })

  test('blocks users that do not have any of the required permissions', async ({ assert }) => {
    const user = await User.create({ email: 'noperm@example.com', password: 'password123' })
    const org = await Organization.create({
      name: 'Org',
      slug: `org-${Date.now()}-x`,
    })

    const middleware = new PermissionMiddleware(['users.delete'])
    await assert.rejects(
      () =>
        middleware.handle(buildCtx({ userId: user.id, organizationId: org.id }), async () => {}),
      AuthorizationException
    )
  })
})
