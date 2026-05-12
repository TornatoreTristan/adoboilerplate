import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import type UserService from '#users/services/user_service'
import type SessionService from '#sessions/services/session_service'
import type SessionRepository from '#sessions/repositories/session_repository'
import type { CreateUserData } from '#shared/types/user'

test.group('UpdateSessionActivity Middleware', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should update last_activity when accessing protected route', async ({ client, assert }) => {
    // Arrange - Créer utilisateur et session
    const userData: CreateUserData = {
      email: 'user@example.com',
      password: 'password123',
    }
    const userService = getService<UserService>(TYPES.UserService)
    const user = await userService.create(userData)

    const sessionService = getService<SessionService>(TYPES.SessionService)
    const sessionRepo = getService<SessionRepository>(TYPES.SessionRepository)
    const session = await sessionService.createSession({
      userId: user.id,
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
    })

    // Antidater explicitement lastActivity pour rendre l'assertion
    // déterministe sans dépendre du clock du test (évite un setTimeout flaky).
    const initialActivity = DateTime.now().minus({ hours: 1 })
    await sessionRepo.update(session.id, { lastActivity: initialActivity })

    // Act - Accéder à une route protégée avec la session
    const response = await client
      .get('/auth/me')
      .withSession({ user_id: user.id, session_id: session.id })

    // Assert
    response.assertStatus(200)

    // Récupérer la session mise à jour
    const updatedSession = await sessionService.findById(session.id)
    assert.isTrue(updatedSession.lastActivity > initialActivity)
  })
})
