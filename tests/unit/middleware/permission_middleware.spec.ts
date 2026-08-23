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

  /**
   * Garde-fou anti fail-open. `canAll([])` renvoie true — rien à vérifier,
   * donc tout est vérifié — si bien qu'une liste de permissions vide combinée
   * à requireAll accorderait l'accès à tout le monde, sans qu'aucune requête
   * n'échoue pour le signaler. Une liste vide ne peut être qu'une erreur de
   * câblage : le middleware doit refuser.
   */
  test('refuses an empty permission list instead of granting access', async ({ assert }) => {
    const middleware = new PermissionMiddleware([], true)
    await assert.rejects(
      () =>
        middleware.handle(buildCtx({ userId: 'user-1', organizationId: 'org-1' }), async () => {}),
      AuthorizationException
    )
  })

  test('refuses an empty permission list passed through route options', async ({ assert }) => {
    const middleware = new PermissionMiddleware()
    await assert.rejects(
      () =>
        middleware.handle(buildCtx({ userId: 'user-1', organizationId: 'org-1' }), async () => {}, {
          permissions: [],
          requireAll: true,
        }),
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

  /**
   * This is the invocation shape AdonisJS actually uses for named
   * middleware called with arguments in a route/group, e.g.
   * `middleware.permission(['warehouse.manage'])` — the router constructs
   * the class with zero constructor args and passes the permissions array
   * as the THIRD argument to `handle()` (see
   * `@adonisjs/http-server`'s `execute()`, which calls
   * `middleware.handle(resolver, ctx, next, middleware.args)`). Before this
   * fix, PermissionMiddleware only read `this.permissions` set at
   * construction time and ignored this argument entirely — meaning any
   * route wired via `middleware.permission([...])` would silently check
   * against an empty permissions list.
   */
  test('reads permissions from the third handle() argument (route-level invocation)', async ({
    assert,
  }) => {
    const user = await User.create({ email: 'route-perm@example.com', password: 'password123' })
    const org = await Organization.create({
      name: 'Org',
      slug: `org-${Date.now()}-route`,
    })
    const role = await Role.create({
      name: 'WarehouseAdmin',
      slug: `warehouse-admin-${Date.now()}`,
      isSystem: false,
    })
    const permission = await Permission.create({
      name: 'Manage warehouse',
      slug: 'warehouse.manage',
      resource: 'warehouse',
      action: 'manage',
    })
    await role.related('permissions').attach([permission.id])

    const auth = getService<AuthorizationService>(TYPES.AuthorizationService)
    await auth.assignRole(user.id, org.id, role.id)

    // Zero-arg construction — this is what the IoC container does when
    // resolving the middleware for a route.
    const middleware = new PermissionMiddleware()

    let nextCalled = false
    await middleware.handle(
      buildCtx({ userId: user.id, organizationId: org.id }),
      async () => {
        nextCalled = true
      },
      ['warehouse.manage']
    )

    assert.isTrue(nextCalled)
  })

  test('third handle() argument still blocks users without the permission', async ({ assert }) => {
    const user = await User.create({ email: 'route-noperm@example.com', password: 'password123' })
    const org = await Organization.create({
      name: 'Org',
      slug: `org-${Date.now()}-route-block`,
    })

    const middleware = new PermissionMiddleware()

    await assert.rejects(
      () =>
        middleware.handle(buildCtx({ userId: user.id, organizationId: org.id }), async () => {}, [
          'warehouse.manage',
        ]),
      AuthorizationException
    )
  })
})
