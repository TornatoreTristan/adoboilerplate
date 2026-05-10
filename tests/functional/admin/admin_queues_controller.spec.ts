import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserService from '#users/services/user_service'
import type { CreateUserData } from '#shared/types/user'
import db from '@adonisjs/lucid/services/db'

test.group('AdminQueuesController', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(async () => {
    const { default: redis } = await import('@adonisjs/redis/services/main')
    const keys = await redis.keys('ratelimit:*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  async function createSuperAdmin() {
    const userData: CreateUserData = {
      email: `superadmin-queue-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Queue Super Admin',
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
      email: `user-queue-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Regular User',
    }
    const userService = getService<UserService>(TYPES.UserService)
    return userService.create(userData)
  }

  test('GET /admin/queues responds 200 for a super admin', async ({ client }) => {
    const admin = await createSuperAdmin()

    const loginResponse = await client.post('/auth/login').withCsrfToken().json({
      email: admin.email,
      password: 'password123',
    })

    const response = await client.get('/admin/queues').withSession(loginResponse.session())

    response.assertStatus(200)
  })

  test('GET /admin/queues responds 403 for a regular user', async ({ client }) => {
    const user = await createRegularUser()

    const loginResponse = await client.post('/auth/login').withCsrfToken().json({
      email: user.email,
      password: 'password123',
    })

    const response = await client
      .get('/admin/queues')
      .withSession(loginResponse.session())
      .header('accept', 'application/json')

    response.assertStatus(403)
  })

  test('GET /admin/queues responds 401 for an unauthenticated request', async ({ client }) => {
    const response = await client.get('/admin/queues').header('accept', 'application/json')

    response.assertStatus(401)
  })

  test('GET /admin/queues/:name responds 200 for a known queue', async ({ client }) => {
    const admin = await createSuperAdmin()

    const loginResponse = await client.post('/auth/login').withCsrfToken().json({
      email: admin.email,
      password: 'password123',
    })

    const response = await client.get('/admin/queues/email').withSession(loginResponse.session())

    response.assertStatus(200)
  })
})
