import { test } from '@japa/runner'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserNotificationPreferenceRepository from '#notifications/repositories/user_notification_preference_repository'
import type UserRepository from '#users/repositories/user_repository'
import type { NotificationType } from '#notifications/types/notification'
import type { NotificationChannel } from '#notifications/models/user_notification_preference'

test.group('UserNotificationPreferenceRepository', (group) => {
  let repository: UserNotificationPreferenceRepository
  let userRepository: UserRepository
  let testUserId: string

  group.each.setup(async () => {
    repository = getService<UserNotificationPreferenceRepository>(
      TYPES.UserNotificationPreferenceRepository
    )
    userRepository = getService<UserRepository>(TYPES.UserRepository)

    // Créer un utilisateur de test
    const user = await userRepository.create({
      email: `test-prefs-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@example.com`,
      password: 'password123',
      fullName: 'Test Preferences User',
    } as any)
    testUserId = user.id
  })

  test('devrait créer une préférence de notification', async ({ assert }) => {
    const preference = await repository.create({
      userId: testUserId,
      notificationType: 'user.mentioned' as NotificationType,
      channel: 'in_app' as NotificationChannel,
      enabled: true,
    } as any)

    assert.exists(preference.id)
    assert.equal(preference.userId, testUserId)
    assert.equal(preference.notificationType, 'user.mentioned')
    assert.equal(preference.channel, 'in_app')
    assert.isTrue(preference.enabled)
  })

  test("devrait récupérer toutes les préférences d'un utilisateur", async ({ assert }) => {
    // Créer plusieurs préférences
    await repository.create({
      userId: testUserId,
      notificationType: 'user.mentioned' as NotificationType,
      channel: 'in_app' as NotificationChannel,
      enabled: true,
    } as any)

    await repository.create({
      userId: testUserId,
      notificationType: 'org.invitation' as NotificationType,
      channel: 'email' as NotificationChannel,
      enabled: false,
    } as any)

    const preferences = await repository.findByUserId(testUserId)

    assert.isAtLeast(preferences.length, 2)
    assert.isTrue(preferences.every((p) => p.userId === testUserId))
  })

  test('devrait récupérer une préférence spécifique par type et canal', async ({ assert }) => {
    await repository.create({
      userId: testUserId,
      notificationType: 'system.announcement' as NotificationType,
      channel: 'push' as NotificationChannel,
      enabled: true,
    } as any)

    const preference = await repository.findByUserAndType(
      testUserId,
      'system.announcement' as NotificationType,
      'push' as NotificationChannel
    )

    assert.exists(preference)
    assert.equal(preference!.notificationType, 'system.announcement')
    assert.equal(preference!.channel, 'push')
  })

  test('devrait retourner null si préférence non trouvée', async ({ assert }) => {
    const preference = await repository.findByUserAndType(
      testUserId,
      'org.member_joined' as NotificationType,
      'email' as NotificationChannel
    )

    assert.isNull(preference)
  })

  test('devrait vérifier si une notification est activée (défaut true si non défini)', async ({
    assert,
  }) => {
    // Pas de préférence définie = activé par défaut
    const isEnabled = await repository.isEnabled(
      testUserId,
      'user.mentioned' as NotificationType,
      'in_app' as NotificationChannel
    )

    assert.isTrue(isEnabled)
  })

  test('devrait vérifier si une notification est activée (préférence définie à true)', async ({
    assert,
  }) => {
    await repository.create({
      userId: testUserId,
      notificationType: 'org.invitation' as NotificationType,
      channel: 'email' as NotificationChannel,
      enabled: true,
    } as any)

    const isEnabled = await repository.isEnabled(
      testUserId,
      'org.invitation' as NotificationType,
      'email' as NotificationChannel
    )

    assert.isTrue(isEnabled)
  })

  test('devrait vérifier si une notification est désactivée (préférence définie à false)', async ({
    assert,
  }) => {
    await repository.create({
      userId: testUserId,
      notificationType: 'system.maintenance' as NotificationType,
      channel: 'push' as NotificationChannel,
      enabled: false,
    } as any)

    const isEnabled = await repository.isEnabled(
      testUserId,
      'system.maintenance' as NotificationType,
      'push' as NotificationChannel
    )

    assert.isFalse(isEnabled)
  })

  test('devrait créer ou mettre à jour une préférence (création)', async ({ assert }) => {
    const preference = await repository.setPreference(
      testUserId,
      'user.mentioned' as NotificationType,
      'in_app' as NotificationChannel,
      true
    )

    assert.exists(preference.id)
    assert.equal(preference.notificationType, 'user.mentioned')
    assert.isTrue(preference.enabled)
  })

  test('devrait créer ou mettre à jour une préférence (mise à jour)', async ({ assert }) => {
    // Créer d'abord
    const created = await repository.setPreference(
      testUserId,
      'org.invitation' as NotificationType,
      'email' as NotificationChannel,
      true
    )

    // Mettre à jour
    const updated = await repository.setPreference(
      testUserId,
      'org.invitation' as NotificationType,
      'email' as NotificationChannel,
      false
    )

    assert.equal(created.id, updated.id) // Même ID = mise à jour
    assert.isFalse(updated.enabled)
  })

  test('devrait initialiser toutes les préférences par défaut pour un utilisateur', async ({
    assert,
  }) => {
    await repository.initializeDefaultPreferences(testUserId)

    const preferences = await repository.findByUserId(testUserId)

    // 6 types de notifications x 3 canaux = 18 préférences
    assert.equal(preferences.length, 18)

    // Toutes doivent être activées par défaut
    assert.isTrue(preferences.every((p) => p.enabled === true))

    // Vérifier que tous les types sont présents
    const notificationTypes: NotificationType[] = [
      'user.mentioned',
      'org.invitation',
      'org.member_joined',
      'org.member_left',
      'system.announcement',
      'system.maintenance',
    ]

    for (const type of notificationTypes) {
      const prefsForType = preferences.filter((p) => p.notificationType === type)
      assert.equal(prefsForType.length, 3) // 3 canaux
    }
  })

  test("ne devrait pas créer de doublons lors de l'initialisation", async ({ assert }) => {
    // Première initialisation
    await repository.initializeDefaultPreferences(testUserId)
    const firstResult = await repository.findByUserId(testUserId)
    const firstCount = firstResult.length

    // Deuxième initialisation
    await repository.initializeDefaultPreferences(testUserId)
    const secondResult = await repository.findByUserId(testUserId)
    const secondCount = secondResult.length

    assert.equal(firstCount, secondCount)
    assert.equal(firstCount, 18)
  })

  test('devrait respecter la contrainte unique (user_id, notification_type, channel)', async ({
    assert,
  }) => {
    await repository.create({
      userId: testUserId,
      notificationType: 'user.mentioned' as NotificationType,
      channel: 'in_app' as NotificationChannel,
      enabled: true,
    } as any)

    // Tenter de créer un doublon devrait échouer
    await assert.rejects(
      async () => {
        await repository.create({
          userId: testUserId,
          notificationType: 'user.mentioned' as NotificationType,
          channel: 'in_app' as NotificationChannel,
          enabled: false,
        } as any)
      },
      // PostgreSQL unique constraint violation
      /duplicate key value violates unique constraint/
    )
  })
})
