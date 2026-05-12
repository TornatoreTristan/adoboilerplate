import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserService from '#users/services/user_service'
import type AdminService from '#admin/services/admin_service'
import type { CreateUserData } from '#shared/types/user'
import db from '@adonisjs/lucid/services/db'

test.group('AdminIntegrationsController', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(async () => {
    const { default: redis } = await import('@adonisjs/redis/services/main')
    const keys = await redis.keys('ratelimit:*')
    if (keys.length > 0) await redis.del(...keys)
  })

  async function createSuperAdmin() {
    const userData: CreateUserData = {
      email: `superadmin-int-${Date.now()}@example.com`,
      password: 'password123',
    }
    const userService = getService<UserService>(TYPES.UserService)
    const user = await userService.create(userData)
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
      email: `user-int-${Date.now()}@example.com`,
      password: 'password123',
    }
    const userService = getService<UserService>(TYPES.UserService)
    return userService.create(userData)
  }

  test('GET /admin/integrations responds 401 for an anonymous request', async ({ client }) => {
    const response = await client.get('/admin/integrations').header('accept', 'application/json')
    response.assertStatus(401)
  })

  test('GET /admin/integrations responds 403 for a regular user', async ({ client }) => {
    const user = await createRegularUser()
    const login = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: user.email, password: 'password123' })

    const response = await client
      .get('/admin/integrations')
      .withSession(login.session())
      .header('accept', 'application/json')

    response.assertStatus(403)
  })

  test('POST /admin/integrations/stripe rejects an invalid payload (422)', async ({ client }) => {
    const admin = await createSuperAdmin()
    const login = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: admin.email, password: 'password123' })

    // Missing required fields → validator rejects with 422
    const response = await client
      .post('/admin/integrations/stripe')
      .withCsrfToken()
      .withSession(login.session())
      .header('accept', 'application/json')
      .json({})

    response.assertStatus(422)
  })

  test('POST /admin/integrations/stripe persists a valid configuration', async ({
    client,
    assert,
  }) => {
    const admin = await createSuperAdmin()
    const login = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: admin.email, password: 'password123' })

    const response = await client
      .post('/admin/integrations/stripe')
      .withCsrfToken()
      .withSession(login.session())
      .json({
        publicKey: 'pk_test_persistence',
        secretKey: 'sk_test_persistence',
        webhookSecret: 'whsec_persistence',
        isActive: true,
      })

    // PRG redirect on success
    assert.include([200, 302, 303], response.status())

    const adminService = getService<AdminService>(TYPES.AdminService)
    const integration = await adminService.getIntegration('stripe')
    assert.isNotNull(integration)
    assert.equal(integration!.config.publicKey, 'pk_test_persistence')
    assert.isTrue(integration!.isActive)
  })

  test('POST /admin/integrations/stripe responds 403 for a regular user', async ({ client }) => {
    const user = await createRegularUser()
    const login = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: user.email, password: 'password123' })

    const response = await client
      .post('/admin/integrations/stripe')
      .withCsrfToken()
      .withSession(login.session())
      .header('accept', 'application/json')
      .json({
        publicKey: 'pk_test',
        isActive: true,
      })

    response.assertStatus(403)
  })
})
