import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type UserService from '#users/services/user_service'
import type { CreateUserData } from '#shared/types/user'

test.group('Auth Middleware', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should allow access to protected route when authenticated', async ({ client }) => {
    // Arrange - Créer utilisateur et se connecter
    const userData: CreateUserData = {
      email: 'user@example.com',
      password: 'password123',
    }
    const userService = getService<UserService>(TYPES.UserService)
    await userService.create(userData)

    const loginResponse = await client.post('/auth/login').withCsrfToken().json({
      email: 'user@example.com',
      password: 'password123',
      remember: false,
    })

    // Act - Accéder à route protégée avec session active
    const protectedResponse = await client.get('/auth/me').withSession(loginResponse.session())

    // Assert
    protectedResponse.assertStatus(200)
    protectedResponse.assertBodyContains({ success: true })
  })

  test('should block access to protected route when not authenticated', async ({ client }) => {
    // Act - Accéder à route protégée sans session avec header JSON
    const response = await client.get('/auth/me').header('accept', 'application/json')

    // Assert
    response.assertStatus(401)
    response.assertBodyContains({
      success: false,
      error: {
        message: 'Authentification requise',
        code: 'AUTH_FAILED',
      },
    })
  })
})
