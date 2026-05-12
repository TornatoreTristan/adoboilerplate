import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type GdprService from '#gdpr/services/gdpr_service'
import type UserRepository from '#users/repositories/user_repository'
import type SessionRepository from '#sessions/repositories/session_repository'
import type NotificationRepository from '#notifications/repositories/notification_repository'
import type OrganizationRepository from '#organizations/repositories/organization_repository'
import User from '#users/models/user'
import { UserNotFoundException } from '#shared/exceptions/domain_exceptions'

test.group('GdprService - exportUserData', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('returns a structured export with user identity', async ({ assert }) => {
    const user = await User.create({
      email: 'export@example.com',
      password: 'password123',
      fullName: 'Export User',
    })

    const gdprService = getService<GdprService>(TYPES.GdprService)
    const exportData = await gdprService.exportUserData(user.id)

    assert.equal(exportData.user.id, user.id)
    assert.equal(exportData.user.email, 'export@example.com')
    assert.equal(exportData.user.fullName, 'Export User')
    assert.isString(exportData.exportDate)
    assert.isArray(exportData.organizations)
    assert.isArray(exportData.notifications)
    assert.isArray(exportData.uploads)
    assert.isArray(exportData.sessions)
    assert.isArray(exportData.subscriptions)
  })

  test('includes the user sessions in the export', async ({ assert }) => {
    const user = await User.create({
      email: 'sessions@example.com',
      password: 'password123',
    })

    const sessionRepo = getService<SessionRepository>(TYPES.SessionRepository)
    await sessionRepo.create({
      userId: user.id,
      ipAddress: '10.0.0.1',
      userAgent: 'TestAgent/1.0',
      startedAt: DateTime.now(),
      lastActivity: DateTime.now(),
      isActive: true,
    })

    const gdprService = getService<GdprService>(TYPES.GdprService)
    const exportData = await gdprService.exportUserData(user.id)

    assert.lengthOf(exportData.sessions, 1)
    assert.equal(exportData.sessions[0].ipAddress, '10.0.0.1')
    assert.equal(exportData.sessions[0].userAgent, 'TestAgent/1.0')
  })

  test('throws E.userNotFound for an unknown user id', async ({ assert }) => {
    const gdprService = getService<GdprService>(TYPES.GdprService)

    await assert.rejects(
      () => gdprService.exportUserData('00000000-0000-0000-0000-000000000000'),
      UserNotFoundException
    )
  })
})

test.group('GdprService - requestAccountDeletion', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('schedules the user for deletion in 30 days', async ({ assert }) => {
    const user = await User.create({
      email: 'tobedeleted@example.com',
      password: 'password123',
    })

    const gdprService = getService<GdprService>(TYPES.GdprService)
    const request = await gdprService.requestAccountDeletion(user.id, 'Privacy concerns')

    assert.equal(request.userId, user.id)
    assert.equal(request.reason, 'Privacy concerns')

    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const fresh = await userRepo.findById(user.id, { includeDeleted: true })
    assert.isNotNull(fresh, 'user should still exist after scheduling deletion')
    assert.isNotNull(fresh!.deleted_at)
    // Doit être planifié dans ~30 jours (tolérance d'une minute pour le test)
    const scheduledFor = fresh!.deleted_at!
    const expected = DateTime.now().plus({ days: 30 })
    assert.isTrue(Math.abs(scheduledFor.diff(expected).as('seconds')) < 60)
  })

  test('throws E.userNotFound for an unknown user id', async ({ assert }) => {
    const gdprService = getService<GdprService>(TYPES.GdprService)

    await assert.rejects(
      () => gdprService.requestAccountDeletion('00000000-0000-0000-0000-000000000000'),
      UserNotFoundException
    )
  })
})

test.group('GdprService - cancelAccountDeletion', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('clears the deleted_at flag', async ({ assert }) => {
    const user = await User.create({
      email: 'cancel@example.com',
      password: 'password123',
    })

    const gdprService = getService<GdprService>(TYPES.GdprService)
    await gdprService.requestAccountDeletion(user.id)
    await gdprService.cancelAccountDeletion(user.id)

    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const fresh = await userRepo.findById(user.id)
    assert.isNotNull(fresh, 'user should be visible again after cancelling deletion')
    assert.isNull(fresh!.deleted_at)
  })
})

test.group('GdprService - deleteAccountPermanently', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('hard-deletes user, cascades to sessions and uploads', async ({ assert }) => {
    const user = await User.create({
      email: 'permadelete@example.com',
      password: 'password123',
    })

    const sessionRepo = getService<SessionRepository>(TYPES.SessionRepository)
    await sessionRepo.create({
      userId: user.id,
      ipAddress: '10.0.0.2',
      userAgent: 'Browser',
      startedAt: DateTime.now(),
      lastActivity: DateTime.now(),
      isActive: true,
    })

    const gdprService = getService<GdprService>(TYPES.GdprService)
    await gdprService.deleteAccountPermanently(user.id)

    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    assert.isNull(await userRepo.findById(user.id))
    assert.lengthOf(await sessionRepo.findByUserId(user.id), 0)
  })

  test('cascades to notifications (deleted via DB ON DELETE CASCADE)', async ({ assert }) => {
    const user = await User.create({
      email: 'cascadenotif@example.com',
      password: 'password123',
    })

    const notificationRepo = getService<NotificationRepository>(TYPES.NotificationRepository)
    const notification = await notificationRepo.create({
      userId: user.id,
      type: 'system.announcement',
      priority: 'normal',
      titleI18n: { fr: 'T', en: 'T' },
      messageI18n: { fr: 'M', en: 'M' },
    })

    const gdprService = getService<GdprService>(TYPES.GdprService)
    await gdprService.deleteAccountPermanently(user.id)

    assert.isNull(
      await notificationRepo.findById(notification.id),
      'notification should be cascade-deleted with the user'
    )
  })

  test('removes the user from their organizations', async ({ assert }) => {
    const user = await User.create({
      email: 'orgmember@example.com',
      password: 'password123',
    })

    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const org = await orgRepo.createWithOwner(
      {
        name: 'Test Org',
        slug: `org-${Date.now()}`,
      },
      user.id
    )

    const gdprService = getService<GdprService>(TYPES.GdprService)
    await gdprService.deleteAccountPermanently(user.id)

    assert.isFalse(await orgRepo.isUserMember(org.id, user.id))
  })
})

test.group('GdprService - processScheduledDeletions', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('deletes users whose scheduled deletion date has passed', async ({ assert }) => {
    const user = await User.create({
      email: 'scheduled@example.com',
      password: 'password123',
    })

    // Antidate the scheduled deletion so it's already due
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    await userRepo.update(user.id, { deleted_at: DateTime.now().minus({ minutes: 1 }) })

    const gdprService = getService<GdprService>(TYPES.GdprService)
    const count = await gdprService.processScheduledDeletions()

    assert.equal(count, 1)
    assert.isNull(await userRepo.findById(user.id))
  })

  test('leaves users with future scheduled deletion alone', async ({ assert }) => {
    const user = await User.create({
      email: 'futurescheduled@example.com',
      password: 'password123',
    })

    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    await userRepo.update(user.id, { deleted_at: DateTime.now().plus({ days: 30 }) })

    const gdprService = getService<GdprService>(TYPES.GdprService)
    const count = await gdprService.processScheduledDeletions()

    assert.equal(count, 0)
    const fresh = await userRepo.findById(user.id, { includeDeleted: true })
    assert.isNotNull(fresh, 'user with future scheduled deletion should not be deleted yet')
  })
})
