import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserService from '#users/services/user_service'
import type { CreateUserData } from '#shared/types/user'
import db from '@adonisjs/lucid/services/db'

test.group('AdminSubscriptionsController - auth gating', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(async () => {
    const { default: redis } = await import('@adonisjs/redis/services/main')
    const keys = await redis.keys('ratelimit:*')
    if (keys.length > 0) await redis.del(...keys)
  })

  async function createSuperAdmin() {
    const userData: CreateUserData = {
      email: `superadmin-subs-${Date.now()}@example.com`,
      password: 'password123',
    }
    const userService = getService<UserService>(TYPES.UserService)
    const user = await userService.create(userData)
    await db
      .table('roles')
      .insert({
        id: crypto.randomUUID(),
        name: 'Super Admin',
        slug: 'super-admin',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflict('slug')
      .ignore()
    await db.table('user_roles').insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      role_slug: 'super-admin',
      granted_at: new Date(),
    })
    return user
  }

  async function createRegularUser() {
    const userData: CreateUserData = {
      email: `user-subs-${Date.now()}@example.com`,
      password: 'password123',
    }
    const userService = getService<UserService>(TYPES.UserService)
    return userService.create(userData)
  }

  test('GET /admin/subscriptions responds 403 for a regular user', async ({ client }) => {
    const user = await createRegularUser()
    const login = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: user.email, password: 'password123' })

    const response = await client
      .get('/admin/subscriptions')
      .withSession(login.session())
      .header('accept', 'application/json')

    response.assertStatus(403)
  })

  test('GET /admin/subscriptions responds 401 for an anonymous request', async ({ client }) => {
    const response = await client.get('/admin/subscriptions').header('accept', 'application/json')
    response.assertStatus(401)
  })

  test('POST /admin/subscriptions/:id/pause requires authentication', async ({ client }) => {
    const response = await client
      .post('/admin/subscriptions/some-id/pause')
      .withCsrfToken()
      .header('accept', 'application/json')

    response.assertStatus(401)
  })

  test('POST /admin/subscriptions/:id/cancel responds 403 for a regular user', async ({
    client,
  }) => {
    const user = await createRegularUser()
    const login = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: user.email, password: 'password123' })

    const response = await client
      .post('/admin/subscriptions/some-id/cancel')
      .withCsrfToken()
      .withSession(login.session())
      .header('accept', 'application/json')

    response.assertStatus(403)
  })

  test('POST /admin/subscriptions/:id/pause redirects (PRG) for a super admin', async ({
    client,
    assert,
  }) => {
    const admin = await createSuperAdmin()
    const login = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: admin.email, password: 'password123' })

    // Targeting a non-existent subscription id — the controller catches the
    // failure and still returns a PRG redirect with an error flash, which is
    // exactly what we assert here. The Stripe API is not hit because the
    // service throws before reaching the network layer.
    const response = await client
      .post('/admin/subscriptions/00000000-0000-0000-0000-000000000000/pause')
      .withCsrfToken()
      .withSession(login.session())

    assert.include([200, 302, 303], response.status())
  })
})
