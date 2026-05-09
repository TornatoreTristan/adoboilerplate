import { test } from '@japa/runner'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import NotificationService from '#notifications/services/notification_service'
import EventBusService from '#shared/services/event_bus_service'
import NotificationListeners from '#notifications/listeners/notification_listeners'
import User from '#users/models/user'
import Organization from '#organizations/models/organization'
import OrganizationInvitation from '#organizations/models/organization_invitation'

test.group('Notification Listeners', (group) => {
  let notificationService: NotificationService
  let eventBus: EventBusService
  let listeners: NotificationListeners

  group.setup(async () => {
    notificationService = getService<NotificationService>(TYPES.NotificationService)
    eventBus = getService<EventBusService>(TYPES.EventBus)
    listeners = new NotificationListeners(notificationService, eventBus)
  })

  group.teardown(async () => {
    // Cleanup listeners
    listeners.unregisterAll()
  })

  test('should create welcome notification when user is created', async ({ assert }) => {
    // Arrange
    const mockUser = {
      id: 'user-123',
      email: 'newuser@example.com',
      fullName: 'John Doe',
      createdAt: new Date(),
    } as unknown as User

    // Register listeners
    listeners.register()

    // Act
    await eventBus.emit('user.created', { record: mockUser }, { async: false })

    // Wait a bit for async operations
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Assert - Vérifier qu'une notification a été créée
    const notifications = await notificationService.getUserNotifications(mockUser.id, {
      type: 'system.announcement',
    })

    assert.isTrue(notifications.length > 0, 'Should create a welcome notification')
    const welcomeNotif = notifications[0]
    assert.equal(welcomeNotif.userId, mockUser.id)
    assert.equal(welcomeNotif.type, 'system.announcement')
    assert.isNotNull(welcomeNotif.titleI18n)
    assert.isNotNull(welcomeNotif.messageI18n)
  })

  test('should create organization invitation notification when invitation is created', async ({
    assert,
  }) => {
    // Arrange
    const mockInvitation = {
      id: 'invitation-123',
      inviteeEmail: 'invitee@example.com',
      inviterId: 'inviter-456',
      organizationId: 'org-789',
      organization: {
        name: 'ACME Corp',
      } as Organization,
      inviter: {
        fullName: 'Jane Smith',
        email: 'jane@example.com',
      } as unknown as User,
    } as unknown as OrganizationInvitation

    // Créer un utilisateur avec cet email
    const inviteeUser = {
      id: 'invitee-user-id',
      email: 'invitee@example.com',
    } as unknown as User

    // Register listeners
    listeners.register()

    // Act
    await eventBus.emit(
      'organizationinvitation.created',
      { record: mockInvitation },
      { async: false }
    )

    // Wait a bit for async operations
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Assert
    const notifications = await notificationService.getUserNotifications(inviteeUser.id, {
      type: 'org.invitation',
    })

    // Note: Le test va échouer car le listener n'existe pas encore (RED phase)
    assert.isTrue(notifications.length > 0, 'Should create an invitation notification')
    const invitationNotif = notifications[0]
    assert.equal(invitationNotif.type, 'org.invitation')
    assert.equal(invitationNotif.organizationId, mockInvitation.organizationId)
  })

  test('should create subscription notification when subscription is created', async ({
    assert,
  }) => {
    // Arrange
    const mockSubscription = {
      id: 'subscription-123',
      userId: 'user-456',
      organizationId: 'org-789',
      planId: 'plan-pro',
      status: 'active',
    }

    // Register listeners
    listeners.register()

    // Act
    await eventBus.emit('subscription.created', { record: mockSubscription }, { async: false })

    // Wait a bit for async operations
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Assert
    const notifications = await notificationService.getUserNotifications(mockSubscription.userId, {
      type: 'system.announcement',
    })

    assert.isTrue(notifications.length > 0, 'Should create a subscription notification')
    const subscriptionNotif = notifications.find((n) => n.data?.subscriptionId === mockSubscription.id)
    assert.isDefined(subscriptionNotif, 'Should find the subscription notification')
  })

  test('should not crash if user data is incomplete', async ({ assert }) => {
    // Arrange
    const incompleteUser = {
      id: 'user-incomplete',
    } as unknown as User

    listeners.register()

    // Act & Assert - Ne devrait pas crasher
    await assert.doesNotReject(async () => {
      await eventBus.emit('user.created', { record: incompleteUser }, { async: false })
    })
  })

  test('should unregister all listeners properly', async ({ assert }) => {
    // Arrange
    listeners.register()
    const initialListeners = eventBus.getEventListeners()

    // Act
    listeners.unregisterAll()

    // Assert
    const afterListeners = eventBus.getEventListeners()
    assert.isTrue(
      Object.keys(afterListeners).length < Object.keys(initialListeners).length,
      'Should have fewer listeners after unregister'
    )
  })
})
