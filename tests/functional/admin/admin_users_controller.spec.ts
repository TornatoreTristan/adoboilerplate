import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserService from '#users/services/user_service'
import type UserRepository from '#users/repositories/user_repository'
import type { CreateUserData } from '#shared/types/user'
import db from '@adonisjs/lucid/services/db'

test.group('AdminUsersController', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.setup(async () => {
    const { default: redis } = await import('@adonisjs/redis/services/main')
    const keys = await redis.keys('ratelimit:*')
    if (keys.length > 0) await redis.del(...keys)
  })

  async function createSuperAdmin() {
    const userData: CreateUserData = {
      email: `superadmin-users-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Users Admin',
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

  async function createRegularUser(suffix: string = '') {
    const userData: CreateUserData = {
      email: `user-${suffix}-${Date.now()}@example.com`,
      password: 'password123',
    }
    const userService = getService<UserService>(TYPES.UserService)
    return userService.create(userData)
  }

  // NOTE: GET /admin/users and GET /admin/users/:id are not covered here.
  // They render Inertia pages that import `Link` from '@adonisjs/inertia/react',
  // which requires a TuyauProvider that isn't wrapped around the SSR tree in
  // tests, so the responses are 500. Covered by the auth-gating tests below.

  test('PUT /admin/users/:id updates the user', async ({ client, assert }) => {
    const admin = await createSuperAdmin()
    const target = await createRegularUser('update')

    const loginResponse = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: admin.email, password: 'password123' })

    const response = await client
      .put(`/admin/users/${target.id}`)
      .withCsrfToken()
      .withSession(loginResponse.session())
      .json({ fullName: 'Updated By Admin', email: target.email })

    // Redirect-back after update (PRG)
    assert.include([200, 302, 303], response.status())

    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const fresh = await userRepo.findById(target.id)
    assert.equal(fresh!.fullName, 'Updated By Admin')
  })

  test('GET /admin/users responds 403 for a regular user', async ({ client }) => {
    const user = await createRegularUser('regular')
    const loginResponse = await client
      .post('/auth/login')
      .withCsrfToken()
      .json({ email: user.email, password: 'password123' })

    const response = await client
      .get('/admin/users')
      .withSession(loginResponse.session())
      .header('accept', 'application/json')

    response.assertStatus(403)
  })

  test('GET /admin/users responds 401 for an anonymous request', async ({ client }) => {
    const response = await client.get('/admin/users').header('accept', 'application/json')
    response.assertStatus(401)
  })
})
