import { test } from '@japa/runner'
import NotificationRepository from '#notifications/repositories/notification_repository'
import Notification from '#notifications/models/notification'
import User from '#users/models/user'
import Organization from '#organizations/models/organization'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'

test.group('NotificationRepository', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  let user: User
  let organization: Organization

  group.each.setup(async () => {
    user = await User.create({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    })

    organization = await Organization.create({
      name: 'Test Org',
      slug: 'test-org',
    })
  })

  test('devrait créer une nouvelle notification', async ({ assert }) => {
    const repository = new NotificationRepository()
    const notificationData = {
      userId: user.id,
      organizationId: organization.id,
      type: 'user.mentioned' as const,
      titleI18n: { fr: 'Vous avez été mentionné', en: 'You were mentioned' },
      messageI18n: {
        fr: 'John Doe vous a mentionné dans un commentaire',
        en: 'John Doe mentioned you in a comment',
      },
      data: { commentId: '123', userId: 'abc' },
    }

    const result = await repository.create(notificationData)

    assert.isObject(result)
    assert.equal(result.userId, notificationData.userId)
    assert.equal(result.organizationId, notificationData.organizationId)
    assert.equal(result.type, notificationData.type)
    assert.equal(result.title, 'Vous avez été mentionné')
    assert.equal(result.message, 'John Doe vous a mentionné dans un commentaire')
    assert.deepEqual(result.data, notificationData.data)
    assert.isTrue(result.readAt === null || result.readAt === undefined)
    assert.isString(result.id)
  })

  test('devrait créer une notification sans organization', async ({ assert }) => {
    const repository = new NotificationRepository()
    const notificationData = {
      userId: user.id,
      organizationId: null,
      type: 'system.announcement' as const,
      titleI18n: { fr: 'Annonce système', en: 'System announcement' },
      messageI18n: { fr: 'Maintenance programmée demain', en: 'Maintenance scheduled tomorrow' },
    }

    const result = await repository.create(notificationData)

    assert.isObject(result)
    assert.equal(result.userId, notificationData.userId)
    assert.isNull(result.organizationId)
  })

  test('devrait trouver une notification par ID', async ({ assert }) => {
    const repository = new NotificationRepository()
    const notification = await Notification.create({
      userId: user.id,
      organizationId: organization.id,
      type: 'user.mentioned',
      titleI18n: { fr: 'Test', en: 'Test' },
      messageI18n: { fr: 'Test message', en: 'Test message' },
    })

    const result = await repository.findById(notification.id)

    assert.isObject(result)
    assert.equal(result?.id, notification.id)
    assert.equal(result?.title, notification.title)
  })

  test('devrait retourner null pour une notification inexistante', async ({ assert }) => {
    const repository = new NotificationRepository()
    const result = await repository.findById('00000000-0000-0000-0000-000000000000')

    assert.isNull(result)
  })

  test("devrait trouver toutes les notifications d'un utilisateur", async ({ assert }) => {
    const repository = new NotificationRepository()

    await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      titleI18n: { fr: 'Notification 1', en: 'Notification 1' },
      messageI18n: { fr: 'Message 1', en: 'Message 1' },
    })

    await Notification.create({
      userId: user.id,
      type: 'org.invitation',
      titleI18n: { fr: 'Notification 2', en: 'Notification 2' },
      messageI18n: { fr: 'Message 2', en: 'Message 2' },
    })

    const otherUser = await User.create({
      email: 'other@example.com',
      password: 'password',
    })

    await Notification.create({
      userId: otherUser.id,
      type: 'user.mentioned',
      titleI18n: { fr: 'Other notification', en: 'Other notification' },
      messageI18n: { fr: 'Other message', en: 'Other message' },
    })

    const result = await repository.findByUserId(user.id)

    assert.isArray(result)
    assert.lengthOf(result, 2)
    assert.isTrue(result.every((n) => n.userId === user.id))
  })

  test('devrait marquer une notification comme lue', async ({ assert }) => {
    const repository = new NotificationRepository()
    const notification = await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      titleI18n: { fr: 'Test', en: 'Test' },
      messageI18n: { fr: 'Test message', en: 'Test message' },
    })

    assert.isTrue(notification.readAt === null || notification.readAt === undefined)

    await repository.markAsRead(notification.id)

    const updated = await Notification.find(notification.id)
    assert.isNotNull(updated?.readAt)
    assert.instanceOf(updated?.readAt, DateTime as any)
  })

  test('devrait marquer plusieurs notifications comme lues', async ({ assert }) => {
    const repository = new NotificationRepository()

    const notification1 = await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      titleI18n: { fr: 'Test 1', en: 'Test 1' },
      messageI18n: { fr: 'Message 1', en: 'Message 1' },
    })

    const notification2 = await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      titleI18n: { fr: 'Test 2', en: 'Test 2' },
      messageI18n: { fr: 'Message 2', en: 'Message 2' },
    })

    const count = await repository.markAsReadBulk([notification1.id, notification2.id])

    assert.equal(count, 2)

    const updated1 = await Notification.find(notification1.id)
    const updated2 = await Notification.find(notification2.id)

    assert.isNotNull(updated1?.readAt)
    assert.isNotNull(updated2?.readAt)
  })

  test("devrait compter les notifications non lues d'un utilisateur", async ({ assert }) => {
    const repository = new NotificationRepository()

    await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      titleI18n: { fr: 'Unread 1', en: 'Unread 1' },
      messageI18n: { fr: 'Message 1', en: 'Message 1' },
    })

    await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      titleI18n: { fr: 'Unread 2', en: 'Unread 2' },
      messageI18n: { fr: 'Message 2', en: 'Message 2' },
    })

    await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      titleI18n: { fr: 'Read', en: 'Read' },
      messageI18n: { fr: 'Message read', en: 'Message read' },
      readAt: DateTime.now(),
    })

    const count = await repository.countUnreadByUserId(user.id)

    assert.equal(count, 2)
  })

  test('devrait soft delete une notification', async ({ assert }) => {
    const repository = new NotificationRepository()
    const notification = await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      titleI18n: { fr: 'Test', en: 'Test' },
      messageI18n: { fr: 'Test message', en: 'Test message' },
    })

    await repository.delete(notification.id, { soft: true })

    const deleted = await Notification.find(notification.id)
    assert.isNotNull(deleted?.deleted_at)
  })

  test('devrait restore une notification soft deleted', async ({ assert }) => {
    const repository = new NotificationRepository()
    const notification = await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      titleI18n: { fr: 'Test', en: 'Test' },
      messageI18n: { fr: 'Test message', en: 'Test message' },
      deleted_at: DateTime.now(),
    })

    assert.isNotNull(notification.deleted_at)

    const restored = await repository.restore(notification.id)

    assert.isTrue(restored.deleted_at === null || restored.deleted_at === undefined)
  })

  test('devrait filtrer les notifications par type', async ({ assert }) => {
    const repository = new NotificationRepository()

    await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      titleI18n: { fr: 'Mention', en: 'Mention' },
      messageI18n: { fr: 'You were mentioned', en: 'You were mentioned' },
    })

    await Notification.create({
      userId: user.id,
      type: 'org.invitation',
      titleI18n: { fr: 'Invitation', en: 'Invitation' },
      messageI18n: { fr: 'You were invited', en: 'You were invited' },
    })

    const result = await repository.findBy({ type: 'user.mentioned' })

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].type, 'user.mentioned')
  })

  test('devrait filtrer les notifications non lues', async ({ assert }) => {
    const repository = new NotificationRepository()

    await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      titleI18n: { fr: 'Unread', en: 'Unread' },
      messageI18n: { fr: 'Unread message', en: 'Unread message' },
    })

    await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      titleI18n: { fr: 'Read', en: 'Read' },
      messageI18n: { fr: 'Read message', en: 'Read message' },
      readAt: DateTime.now(),
    })

    const result = await repository.findUnreadByUserId(user.id)

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].title, 'Unread')
  })

  test('devrait créer une notification avec priorité', async ({ assert }) => {
    const repository = new NotificationRepository()
    const notificationData = {
      userId: user.id,
      type: 'system.announcement' as const,
      priority: 'urgent' as const,
      titleI18n: { fr: 'Alerte critique', en: 'Critical alert' },
      messageI18n: { fr: "Maintenance d'urgence", en: 'Emergency maintenance' },
    }

    const result = await repository.create(notificationData)

    assert.isObject(result)
    assert.equal(result.priority, 'urgent')
  })

  test('devrait utiliser la priorité "normal" par défaut', async ({ assert }) => {
    const repository = new NotificationRepository()
    const notificationData = {
      userId: user.id,
      type: 'user.mentioned' as const,
      titleI18n: { fr: 'Test', en: 'Test' },
      messageI18n: { fr: 'Test message', en: 'Test message' },
    }

    const result = await repository.create(notificationData)

    assert.isObject(result)
    assert.equal(result.priority, 'normal')
  })

  test('devrait trier les notifications par priorité puis date', async ({ assert }) => {
    const repository = new NotificationRepository()

    await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      priority: 'normal',
      titleI18n: { fr: 'Normal 1', en: 'Normal 1' },
      messageI18n: { fr: 'Message normal', en: 'Normal message' },
    })

    await Notification.create({
      userId: user.id,
      type: 'system.announcement',
      priority: 'urgent',
      titleI18n: { fr: 'Urgent 1', en: 'Urgent 1' },
      messageI18n: { fr: 'Message urgent', en: 'Urgent message' },
    })

    await Notification.create({
      userId: user.id,
      type: 'system.announcement',
      priority: 'high',
      titleI18n: { fr: 'High 1', en: 'High 1' },
      messageI18n: { fr: 'Message high', en: 'High message' },
    })

    await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      priority: 'low',
      titleI18n: { fr: 'Low 1', en: 'Low 1' },
      messageI18n: { fr: 'Message low', en: 'Low message' },
    })

    const result = await repository.findByUserIdSortedByPriority(user.id)

    assert.isArray(result)
    assert.lengthOf(result, 4)
    assert.equal(result[0].priority, 'urgent')
    assert.equal(result[1].priority, 'high')
    assert.equal(result[2].priority, 'normal')
    assert.equal(result[3].priority, 'low')
  })

  test('devrait créer une notification avec actions', async ({ assert }) => {
    const repository = new NotificationRepository()
    const actions = [
      {
        label: 'Accepter',
        labelI18n: { fr: 'Accepter', en: 'Accept' },
        endpoint: '/api/invitations/123/accept',
        method: 'POST' as const,
        style: 'primary' as const,
      },
      {
        label: 'Refuser',
        labelI18n: { fr: 'Refuser', en: 'Decline' },
        endpoint: '/api/invitations/123/decline',
        method: 'POST' as const,
        style: 'secondary' as const,
      },
    ]

    const notificationData = {
      userId: user.id,
      type: 'org.invitation' as const,
      titleI18n: { fr: 'Invitation', en: 'Invitation' },
      messageI18n: { fr: 'Vous êtes invité', en: 'You are invited' },
      actions,
    }

    const result = await repository.create(notificationData)

    assert.isObject(result)
    assert.isArray(result.actions)
    assert.lengthOf(result.actions!, 2)
    assert.equal(result.actions![0].label, 'Accepter')
    assert.equal(result.actions![0].method, 'POST')
    assert.equal(result.actions![0].style, 'primary')
  })

  test('devrait créer une notification sans actions', async ({ assert }) => {
    const repository = new NotificationRepository()
    const notificationData = {
      userId: user.id,
      type: 'user.mentioned' as const,
      titleI18n: { fr: 'Test', en: 'Test' },
      messageI18n: { fr: 'Test message', en: 'Test message' },
    }

    const result = await repository.create(notificationData)

    assert.isObject(result)
    assert.isTrue(result.actions === null || result.actions === undefined)
  })
})
