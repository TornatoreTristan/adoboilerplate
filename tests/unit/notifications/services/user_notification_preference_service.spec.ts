import { test } from '@japa/runner'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UserNotificationPreferenceService from '#notifications/services/user_notification_preference_service'
import type UserNotificationPreferenceRepository from '#notifications/repositories/user_notification_preference_repository'
import type UserRepository from '#users/repositories/user_repository'
import type { NotificationType } from '#notifications/types/notification'
import type { NotificationChannel } from '#notifications/models/user_notification_preference'

test.group('UserNotificationPreferenceService', (group) => {
  let service: UserNotificationPreferenceService
  let repository: UserNotificationPreferenceRepository
  let userRepository: UserRepository
  let testUserId: string

  group.each.setup(async () => {
    service = getService<UserNotificationPreferenceService>(TYPES.UserNotificationPreferenceService)
    repository = getService<UserNotificationPreferenceRepository>(
      TYPES.UserNotificationPreferenceRepository
    )
    userRepository = getService<UserRepository>(TYPES.UserRepository)

    // Créer un utilisateur de test
    const user = await userRepository.create({
      email: `test-pref-service-${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Test Preference Service User',
    } as any)
    testUserId = user.id
  })

  test("devrait récupérer les préférences d'un utilisateur", async ({ assert }) => {
    // Créer quelques préférences
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

    const preferences = await service.getUserPreferences(testUserId)

    assert.isAtLeast(preferences.length, 2)
    assert.isTrue(preferences.every((p) => p.userId === testUserId))
  })

  test('devrait vérifier si une notification est activée (défaut = true)', async ({ assert }) => {
    // Aucune préférence définie
    const isEnabled = await service.isNotificationEnabled(
      testUserId,
      'user.mentioned' as NotificationType,
      'in_app' as NotificationChannel
    )

    assert.isTrue(isEnabled)
  })

  test('devrait vérifier si une notification est activée (préférence = true)', async ({
    assert,
  }) => {
    await repository.create({
      userId: testUserId,
      notificationType: 'org.invitation' as NotificationType,
      channel: 'email' as NotificationChannel,
      enabled: true,
    } as any)

    const isEnabled = await service.isNotificationEnabled(
      testUserId,
      'org.invitation' as NotificationType,
      'email' as NotificationChannel
    )

    assert.isTrue(isEnabled)
  })

  test('devrait vérifier si une notification est désactivée (préférence = false)', async ({
    assert,
  }) => {
    await repository.create({
      userId: testUserId,
      notificationType: 'system.maintenance' as NotificationType,
      channel: 'push' as NotificationChannel,
      enabled: false,
    } as any)

    const isEnabled = await service.isNotificationEnabled(
      testUserId,
      'system.maintenance' as NotificationType,
      'push' as NotificationChannel
    )

    assert.isFalse(isEnabled)
  })

  test('devrait utiliser in_app par défaut si canal non spécifié', async ({ assert }) => {
    await repository.create({
      userId: testUserId,
      notificationType: 'user.mentioned' as NotificationType,
      channel: 'in_app' as NotificationChannel,
      enabled: false,
    } as any)

    // Ne pas spécifier le canal (devrait utiliser in_app)
    const isEnabled = await service.isNotificationEnabled(
      testUserId,
      'user.mentioned' as NotificationType
    )

    assert.isFalse(isEnabled)
  })

  test('devrait définir une préférence', async ({ assert }) => {
    const preference = await service.setPreference(
      testUserId,
      'org.member_joined' as NotificationType,
      'email' as NotificationChannel,
      true
    )

    assert.exists(preference.id)
    assert.equal(preference.userId, testUserId)
    assert.equal(preference.notificationType, 'org.member_joined')
    assert.equal(preference.channel, 'email')
    assert.isTrue(preference.enabled)
  })

  test('devrait mettre à jour une préférence existante', async ({ assert }) => {
    // Créer d'abord
    const created = await service.setPreference(
      testUserId,
      'system.announcement' as NotificationType,
      'push' as NotificationChannel,
      true
    )

    // Mettre à jour
    const updated = await service.setPreference(
      testUserId,
      'system.announcement' as NotificationType,
      'push' as NotificationChannel,
      false
    )

    assert.equal(created.id, updated.id)
    assert.isFalse(updated.enabled)
  })

  test('devrait initialiser les préférences par défaut pour un utilisateur', async ({ assert }) => {
    await service.initializeDefaultPreferences(testUserId)

    const preferences = await service.getUserPreferences(testUserId)

    // 6 types x 3 canaux = 18 préférences
    assert.equal(preferences.length, 18)
    assert.isTrue(preferences.every((p) => p.enabled === true))
  })

  test('devrait mettre à jour plusieurs préférences en une seule fois', async ({ assert }) => {
    const preferencesToUpdate = [
      {
        notificationType: 'user.mentioned' as NotificationType,
        channel: 'in_app' as NotificationChannel,
        enabled: false,
      },
      {
        notificationType: 'org.invitation' as NotificationType,
        channel: 'email' as NotificationChannel,
        enabled: true,
      },
      {
        notificationType: 'system.maintenance' as NotificationType,
        channel: 'push' as NotificationChannel,
        enabled: false,
      },
    ]

    const results = await service.updateBulkPreferences(testUserId, preferencesToUpdate)

    assert.equal(results.length, 3)

    // Vérifier que les préférences ont été mises à jour
    const pref1 = await service.isNotificationEnabled(
      testUserId,
      'user.mentioned' as NotificationType,
      'in_app' as NotificationChannel
    )
    assert.isFalse(pref1)

    const pref2 = await service.isNotificationEnabled(
      testUserId,
      'org.invitation' as NotificationType,
      'email' as NotificationChannel
    )
    assert.isTrue(pref2)

    const pref3 = await service.isNotificationEnabled(
      testUserId,
      'system.maintenance' as NotificationType,
      'push' as NotificationChannel
    )
    assert.isFalse(pref3)
  })

  test('devrait gérer les mises à jour en masse avec des préférences existantes', async ({
    assert,
  }) => {
    // Créer une préférence existante
    await service.setPreference(
      testUserId,
      'user.mentioned' as NotificationType,
      'in_app' as NotificationChannel,
      true
    )

    // Mettre à jour en masse (inclut la préférence existante)
    const results = await service.updateBulkPreferences(testUserId, [
      {
        notificationType: 'user.mentioned' as NotificationType,
        channel: 'in_app' as NotificationChannel,
        enabled: false,
      },
      {
        notificationType: 'org.invitation' as NotificationType,
        channel: 'email' as NotificationChannel,
        enabled: true,
      },
    ])

    assert.equal(results.length, 2)

    // Vérifier la mise à jour
    const isEnabled = await service.isNotificationEnabled(
      testUserId,
      'user.mentioned' as NotificationType,
      'in_app' as NotificationChannel
    )
    assert.isFalse(isEnabled)
  })

  test('devrait retourner toutes les préférences vides pour un nouvel utilisateur', async ({
    assert,
  }) => {
    const preferences = await service.getUserPreferences(testUserId)

    // Aucune préférence créée initialement
    assert.equal(preferences.length, 0)
  })

  test('devrait gérer plusieurs canaux pour le même type de notification', async ({ assert }) => {
    await service.setPreference(
      testUserId,
      'user.mentioned' as NotificationType,
      'in_app' as NotificationChannel,
      true
    )
    await service.setPreference(
      testUserId,
      'user.mentioned' as NotificationType,
      'email' as NotificationChannel,
      false
    )
    await service.setPreference(
      testUserId,
      'user.mentioned' as NotificationType,
      'push' as NotificationChannel,
      true
    )

    const inAppEnabled = await service.isNotificationEnabled(
      testUserId,
      'user.mentioned' as NotificationType,
      'in_app' as NotificationChannel
    )
    const emailEnabled = await service.isNotificationEnabled(
      testUserId,
      'user.mentioned' as NotificationType,
      'email' as NotificationChannel
    )
    const pushEnabled = await service.isNotificationEnabled(
      testUserId,
      'user.mentioned' as NotificationType,
      'push' as NotificationChannel
    )

    assert.isTrue(inAppEnabled)
    assert.isFalse(emailEnabled)
    assert.isTrue(pushEnabled)
  })
})
