import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type UserService from '#users/services/user_service'
import type { CreateUserData } from '#shared/types/user'
import db from '@adonisjs/lucid/services/db'

test.group('SuperAdmin Middleware', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  // Earlier specs in the suite hit /auth/login with the same emails this
  // group reuses. The rate-limit counter lives in Redis (not the test DB
  // transaction), so without a flush a 429 from those prior attempts can
  // bubble in here and a test that expected to authenticate ends up
  // unauthenticated.
  group.each.setup(async () => {
    const { default: redis } = await import('@adonisjs/redis/services/main')
    const keys = await redis.keys('ratelimit:*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  test('should allow access to super-admin route when user is super-admin', async ({ client }) => {
    const userData: CreateUserData = {
      email: 'admin@example.com',
      password: 'password123',
      fullName: 'Super Admin',
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

    const loginResponse = await client.post('/auth/login').withCsrfToken().json({
      email: 'admin@example.com',
      password: 'password123',
    })

    const response = await client.get('/admin').withSession(loginResponse.session())

    response.assertStatus(200)
  })

  test('should block access when user is not super-admin', async ({ client }) => {
    const userData: CreateUserData = {
      email: 'user@example.com',
      password: 'password123',
      fullName: 'Regular User',
    }
    const userService = getService<UserService>(TYPES.UserService)
    const user = await userService.create(userData)

    // Defensive: some test runs leave a stale user_roles row for this user
    // (the previous test in this group inserts via raw db.table(), which has
    // intermittently been observed to escape withGlobalTransaction). Drop
    // any super-admin grant against *our* user before asserting denial.
    await db.from('user_roles').where('user_id', user.id).where('role_slug', 'super-admin').delete()

    const loginResponse = await client.post('/auth/login').withCsrfToken().json({
      email: 'user@example.com',
      password: 'password123',
    })

    const response = await client.get('/admin').withSession(loginResponse.session())

    response.assertStatus(403)
  })

  test('should block access when user is not authenticated', async ({ client }) => {
    const response = await client.get('/admin').header('accept', 'application/json')

    response.assertStatus(401)
  })
})
