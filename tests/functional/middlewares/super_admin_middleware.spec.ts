import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import UserService from '#users/services/user_service'
import type { CreateUserData } from '#shared/types/user'
import db from '@adonisjs/lucid/services/db'

test.group('SuperAdmin Middleware', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should allow access to super-admin route when user is super-admin', async ({
    client,
  }) => {
    const userData: CreateUserData = {
      email: 'admin@example.com',
      password: 'password123',
      fullName: 'Super Admin',
    }
    const userService = getService<UserService>(TYPES.UserService)
    const user = await userService.create(userData)

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
    await userService.create(userData)

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
