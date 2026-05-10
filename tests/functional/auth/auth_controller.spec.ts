import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import UserService from '#users/services/user_service'
import type { CreateUserData } from '#shared/types/user'
import SessionService from '#sessions/services/session_service'

test.group('AuthController - Login', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should login via HTTP and create session', async ({ client }) => {
    // Arrange - Créer un utilisateur
    const userData: CreateUserData = {
      email: 'user@example.com',
      password: 'password123',
    }
    const userService = getService<UserService>(TYPES.UserService)
    await userService.create(userData)

    // Act - POST /login
    const response = await client.post('/auth/login').withCsrfToken().json({
      email: 'user@example.com',
      password: 'password123',
      remember: false,
    })

    // Assert
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
    // TODO: vérifier que la session contient user_id
  })

  test('should logout and clear session', async ({ client }) => {
    // Arrange - Créer un utilisateur et se connecter
    const userData: CreateUserData = {
      email: 'user@example.com',
      password: 'password123',
    }
    const userService = getService<UserService>(TYPES.UserService)
    await userService.create(userData)

    // Se connecter
    const loginResponse = await client.post('/auth/login').withCsrfToken().json({
      email: 'user@example.com',
      password: 'password123',
      remember: false,
    })

    loginResponse.assertStatus(200)

    // Act - Se déconnecter
    const logoutResponse = await client.post('/auth/logout').withCsrfToken().json({})

    // Assert - Vérifier la réponse de déconnexion
    logoutResponse.assertStatus(200)
    logoutResponse.assertBodyContains({
      success: true,
      data: {
        message: 'Déconnecté avec succès',
      },
    })

    // Vérification avancée - Tenter d'accéder à une route protégée
    // Cette route devrait échouer car la session a été supprimée
    const protectedResponse = await client
      .get('/auth/me')
      .header('accept', 'application/json') // Route qui nécessite d'être connecté

    protectedResponse.assertStatus(401) // Non autorisé car plus de session
  })

  test('should capture UTM and referrer data during login', async ({ client, assert }) => {
    // Arrange - Créer un utilisateur
    const userData: CreateUserData = {
      email: 'user@example.com',
      password: 'password123',
    }
    const userService = getService<UserService>(TYPES.UserService)
    await userService.create(userData)

    // Act - Se connecter avec des paramètres UTM et referrer
    const response = await client
      .post('/auth/login?utm_source=google&utm_medium=cpc&utm_campaign=winter2024')
      .withCsrfToken()
      .header('referer', 'https://google.com/search')
      .json({
        email: 'user@example.com',
        password: 'password123',
        remember: false,
      })

    // Assert
    response.assertStatus(200)
    response.assertBodyContains({ success: true })

    // Vérifier que la session contient les données UTM/referrer
    const sessionData = response.session()
    const sessionId = sessionData.session_id // Accès direct au lieu de .get()
    const sessionService = getService<SessionService>(TYPES.SessionService)
    const session = await sessionService.findById(sessionId)

    assert.equal(session.utmSource, 'google')
    assert.equal(session.utmMedium, 'cpc')
    assert.equal(session.utmCampaign, 'winter2024')
    assert.equal(session.referrer, 'https://google.com/search')
  })
})
