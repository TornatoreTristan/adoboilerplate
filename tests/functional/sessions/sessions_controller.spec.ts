import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type UserService from '#users/services/user_service'
import type SessionService from '#sessions/services/session_service'
import type { CreateUserData } from '#shared/types/user'

test.group('SessionController', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('GET /api/sessions - should list user sessions', async ({ client }) => {
    // Arrange - Créer utilisateur et plusieurs sessions
    const userData: CreateUserData = {
      email: 'user@example.com',
      password: 'password123',
    }
    const userService = getService<UserService>(TYPES.UserService)
    const user = await userService.create(userData)

    // Créer 2 sessions différentes
    const sessionService = getService<SessionService>(TYPES.SessionService)
    const session1 = await sessionService.createSession({
      userId: user.id,
      ipAddress: '192.168.1.1',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    })

    const session2 = await sessionService.createSession({
      userId: user.id,
      ipAddress: '10.0.0.1',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    })

    // Act - Récupérer les sessions
    const response = await client
      .get('/api/sessions')
      .withSession({ user_id: user.id, session_id: session1.id })

    // Assert
    response.assertStatus(200)
    response.assertBodyContains({
      sessions: [
        {
          id: session1.id,
          deviceType: 'mobile',
          os: 'iOS',
          browser: 'Safari',
          isCurrent: true,
        },
        {
          id: session2.id,
          deviceType: 'desktop',
          os: 'Windows',
          browser: 'Chrome',
          isCurrent: false,
        },
      ],
    })
  })

  test('DELETE /api/sessions/:id - should close specific session', async ({ client, assert }) => {
    // Arrange - Créer utilisateur et 2 sessions
    const userData: CreateUserData = {
      email: 'user@example.com',
      password: 'password123',
    }
    const userService = getService<UserService>(TYPES.UserService)
    const user = await userService.create(userData)

    const sessionService = getService<SessionService>(TYPES.SessionService)
    const session1 = await sessionService.createSession({
      userId: user.id,
      ipAddress: '192.168.1.1',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    })

    const session2 = await sessionService.createSession({
      userId: user.id,
      ipAddress: '10.0.0.1',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    })

    // Act - Fermer session2 depuis session1
    const response = await client
      .delete(`/api/sessions/${session2.id}`)
      .withSession({ user_id: user.id, session_id: session1.id })

    // Assert
    response.assertStatus(200)
    response.assertBodyContains({ success: true })

    // Vérifier que session2 est fermée
    const closedSession = await sessionService.findById(session2.id)
    assert.isFalse(closedSession.isActive)
    assert.exists(closedSession.endedAt)
  })

  test('DELETE /api/sessions/others - should close all other sessions', async ({
    client,
    assert,
  }) => {
    // Arrange - Créer utilisateur et 3 sessions
    const userData: CreateUserData = {
      email: 'user@example.com',
      password: 'password123',
    }
    const userService = getService<UserService>(TYPES.UserService)
    const user = await userService.create(userData)

    const sessionService = getService<SessionService>(TYPES.SessionService)
    const session1 = await sessionService.createSession({
      userId: user.id,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 iPhone',
    })

    const session2 = await sessionService.createSession({
      userId: user.id,
      ipAddress: '10.0.0.1',
      userAgent: 'Mozilla/5.0 Windows',
    })

    const session3 = await sessionService.createSession({
      userId: user.id,
      ipAddress: '172.16.0.1',
      userAgent: 'Mozilla/5.0 Android',
    })

    // Act - Fermer toutes les autres sessions depuis session1
    const response = await client
      .delete('/api/sessions/others')
      .withSession({ user_id: user.id, session_id: session1.id })

    // Assert
    response.assertStatus(200)
    response.assertBodyContains({ success: true })

    // Vérifier que session1 reste active et les autres sont fermées
    const activeSession = await sessionService.findById(session1.id)
    const closedSession2 = await sessionService.findById(session2.id)
    const closedSession3 = await sessionService.findById(session3.id)

    assert.isTrue(activeSession.isActive)
    assert.isFalse(closedSession2.isActive)
    assert.isFalse(closedSession3.isActive)
  })
})
