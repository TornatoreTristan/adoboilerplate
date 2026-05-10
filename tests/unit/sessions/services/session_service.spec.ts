import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type SessionService from '#sessions/services/session_service'
import type UserService from '#users/services/user_service'
import type { CreateUserData } from '#shared/types/user'

test.group('SessionService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create session when user logs in', async ({ assert }) => {
    // Arrange - Créer un utilisateur
    const userData: CreateUserData = {
      email: 'user@example.com',
      password: 'password123',
    }
    const userService = getService<UserService>(TYPES.UserService)
    const user = await userService.create(userData)

    // Act - Créer une session avec un User-Agent mobile
    const sessionService = getService<SessionService>(TYPES.SessionService)
    const session = await sessionService.createSession({
      userId: user.id,
      ipAddress: '127.0.0.1',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    })

    // Assert - Données de base
    assert.exists(session.id)
    assert.equal(session.userId, user.id)
    assert.equal(session.ipAddress, '127.0.0.1')
    assert.isTrue(session.isActive)
    assert.exists(session.startedAt)
    assert.isNull(session.endedAt)

    // Assert - Données enrichies automatiquement
    assert.equal(session.deviceType, 'mobile')
    assert.equal(session.os, 'iOS')
    assert.equal(session.browser, 'Safari')
  })

  test('should end session and mark as inactive', async ({ assert }) => {
    // Arrange - Créer un utilisateur et une session
    const userData: CreateUserData = {
      email: 'user@example.com',
      password: 'password123',
    }
    const userService = getService<UserService>(TYPES.UserService)
    const user = await userService.create(userData)

    const sessionService = getService<SessionService>(TYPES.SessionService)
    const session = await sessionService.createSession({
      userId: user.id,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Test Browser',
    })

    // Act - Fermer la session
    const endedSession = await sessionService.endSession(session.id)

    // Assert
    assert.equal(endedSession.id, session.id)
    assert.isFalse(endedSession.isActive)
    assert.exists(endedSession.endedAt)
    // Compare DateTime timestamps
    assert.isTrue(endedSession.endedAt!.toMillis() >= session.startedAt.toMillis())
  })
})
