import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import RoleMiddleware from '#middleware/role_middleware'
import Role from '#roles/models/role'
import User from '#users/models/user'
import Organization from '#organizations/models/organization'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AuthorizationService from '#roles/services/authorization_service'
import {
  AuthenticationException,
  AuthorizationException,
} from '#shared/exceptions/domain_exceptions'

interface CtxOverrides {
  userId?: string | null
  organizationId?: string | null
}

function buildCtx(overrides: CtxOverrides = {}) {
  return {
    session: { get: (key: string) => (key === 'user_id' ? overrides.userId ?? null : null) },
    organization: overrides.organizationId ? { id: overrides.organizationId } : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any — harness ctx
  } as any
}

test.group('RoleMiddleware - input validation', () => {
  test('throws AuthenticationException when there is no user_id in session', async ({ assert }) => {
    const middleware = new RoleMiddleware(['admin'])
    await assert.rejects(
      () => middleware.handle(buildCtx(), async () => {}),
      AuthenticationException
    )
  })

  test('throws AuthorizationException when there is no organization context', async ({
    assert,
  }) => {
    const middleware = new RoleMiddleware(['admin'])
    await assert.rejects(
      () => middleware.handle(buildCtx({ userId: 'user-1' }), async () => {}),
      AuthorizationException
    )
  })
})

test.group('RoleMiddleware - authorization decision', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('lets users with the required role through', async ({ assert }) => {
    const user = await User.create({
      email: 'admin@example.com',
      password: 'password123',
    })
    const org = await Organization.create({
      name: 'Acme',
      slug: `acme-${Date.now()}`,
    })
    const role = await Role.create({
      name: 'Admin',
      slug: 'admin',
      isSystem: true,
    })
    const auth = getService<AuthorizationService>(TYPES.AuthorizationService)
    await auth.assignRole(user.id, org.id, role.id)

    let nextCalled = false
    const middleware = new RoleMiddleware(['admin'])
    await middleware.handle(buildCtx({ userId: user.id, organizationId: org.id }), async () => {
      nextCalled = true
    })

    assert.isTrue(nextCalled)
  })

  test('blocks users that do not have any of the required roles', async ({ assert }) => {
    const user = await User.create({
      email: 'memberonly@example.com',
      password: 'password123',
    })
    const org = await Organization.create({
      name: 'Acme',
      slug: `acme-${Date.now()}-2`,
    })
    // No role assigned → hasAnyRole returns false.

    const middleware = new RoleMiddleware(['admin'])
    await assert.rejects(
      () =>
        middleware.handle(buildCtx({ userId: user.id, organizationId: org.id }), async () => {}),
      AuthorizationException
    )
  })
})
