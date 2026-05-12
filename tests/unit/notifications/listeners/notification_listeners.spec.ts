import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type NotificationService from '#notifications/services/notification_service'
import type EventBusService from '#shared/services/event_bus_service'
import NotificationListeners from '#notifications/listeners/notification_listeners'
import User from '#users/models/user'
import Organization from '#organizations/models/organization'
import OrganizationInvitation from '#organizations/models/organization_invitation'
import Plan from '#billing/models/plan'
import Subscription from '#billing/models/subscription'
import { DateTime } from 'luxon'

test.group('Notification Listeners', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  let notificationService: NotificationService
  let eventBus: EventBusService
  let listeners: NotificationListeners

  group.each.setup(async () => {
    notificationService = getService<NotificationService>(TYPES.NotificationService)
    eventBus = getService<EventBusService>(TYPES.EventBus)
    listeners = new NotificationListeners(notificationService, eventBus)
  })

  group.each.teardown(async () => {
    listeners.unregisterAll()
  })

  test('should create welcome notification when user is created', async ({ assert }) => {
    const user = await User.create({
      email: 'newuser@example.com',
      password: 'password123',
      fullName: 'John Doe',
    })

    listeners.register()

    await eventBus.emit('user.created', { record: user }, { async: false })
    const notifications = await notificationService.getUserNotifications(user.id, {
      type: 'system.announcement',
    })

    assert.isTrue(notifications.length > 0, 'Should create a welcome notification')
    const welcomeNotif = notifications[0]
    assert.equal(welcomeNotif.userId, user.id)
    assert.equal(welcomeNotif.type, 'system.announcement')
    assert.isNotNull(welcomeNotif.titleI18n)
    assert.isNotNull(welcomeNotif.messageI18n)
  })

  test('should create organization invitation notification when invitation is created', async ({
    assert,
  }) => {
    const inviter = await User.create({
      email: 'inviter@example.com',
      password: 'password123',
      fullName: 'Jane Smith',
    })

    const invitee = await User.create({
      email: 'invitee@example.com',
      password: 'password123',
      fullName: 'Invitee',
    })

    const org = await Organization.create({
      name: 'ACME Corp',
      slug: 'acme-corp',
    })

    const invitation = await OrganizationInvitation.create({
      email: invitee.email,
      organizationId: org.id,
      invitedById: inviter.id,
      role: 'member',
      token: 'fake-token-123',
      expiresAt: DateTime.now().plus({ days: 7 }),
    })

    listeners.register()

    await eventBus.emit('organizationinvitation.created', { record: invitation }, { async: false })
    const notifications = await notificationService.getUserNotifications(invitee.id, {
      type: 'org.invitation',
    })

    assert.isTrue(notifications.length > 0, 'Should create an invitation notification')
    const invitationNotif = notifications[0]
    assert.equal(invitationNotif.type, 'org.invitation')
    assert.equal(invitationNotif.organizationId, org.id)
  })

  test('should create subscription notification when subscription is created', async ({
    assert,
  }) => {
    const owner = await User.create({
      email: 'owner@example.com',
      password: 'password123',
    })

    const org = await Organization.create({
      name: 'Sub Org',
      slug: 'sub-org',
    })

    await org.related('users').attach({
      [owner.id]: { role: 'owner', joined_at: new Date() },
    })

    const plan = await Plan.create({
      nameI18n: { fr: 'Pro', en: 'Pro' },
      slug: 'pro',
      priceMonthly: 29,
      priceYearly: 290,
      currency: 'EUR',
      pricingModel: 'flat',
      isActive: true,
      isVisible: true,
      sortOrder: 1,
    })

    const subscription = await Subscription.create({
      organizationId: org.id,
      planId: plan.id,
      billingInterval: 'month',
      price: 29,
      currency: 'EUR',
      status: 'active',
    })

    listeners.register()

    await eventBus.emit('subscription.created', { record: subscription }, { async: false })
    const notifications = await notificationService.getUserNotifications(owner.id, {
      type: 'system.announcement',
    })

    assert.isTrue(notifications.length > 0, 'Should create a subscription notification')
    const subscriptionNotif = notifications.find(
      (n) => (n.data as Record<string, unknown> | null)?.subscriptionId === subscription.id
    )
    assert.isDefined(subscriptionNotif, 'Should find the subscription notification')
  })

  test('should not crash if user data is incomplete', async ({ assert }) => {
    const incompleteUser = { id: '' } as unknown as User

    listeners.register()

    await assert.doesNotReject(async () => {
      await eventBus.emit('user.created', { record: incompleteUser }, { async: false })
    })
  })

  test('should unregister all listeners properly', async ({ assert }) => {
    const sumListeners = (info: Record<string, { sync: number }>): number =>
      Object.values(info).reduce((acc, e) => acc + e.sync, 0)

    listeners.register()
    const totalAfterRegister = sumListeners(eventBus.getEventListeners())

    listeners.unregisterAll()
    const totalAfterUnregister = sumListeners(eventBus.getEventListeners())

    // Other parts of the boilerplate (audit log listeners, etc.) keep
    // listeners on the same event names, so we compare total handler counts
    // — not distinct event names — to confirm ours were detached.
    assert.equal(
      totalAfterRegister - totalAfterUnregister,
      3,
      'Should have removed exactly the 3 listeners that were registered'
    )
  })
})
