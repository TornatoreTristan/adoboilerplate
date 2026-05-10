import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import { getService } from '#shared/container/container'
import NotificationService from '#notifications/services/notification_service'
import EventBusService, { type EventHandler } from '#shared/services/event_bus_service'
import type {
  UserCreatedEvent,
  OrganizationInvitationCreatedEvent,
  SubscriptionCreatedEvent,
} from '#notifications/types/events'
import type UserRepository from '#users/repositories/user_repository'
import logger from '@adonisjs/core/services/logger'

/**
 * NotificationListeners - Écoute les événements domaine et crée des notifications
 *
 * Architecture:
 * - Écoute les événements du EventBus (sync/async)
 * - Crée automatiquement des notifications via NotificationService
 * - Gère les erreurs sans bloquer les workflows
 */
@injectable()
export default class NotificationListeners {
  // Multiple register() calls would leak handlers if we keyed by event name
  // alone (Map.set overwrites). We track every handler ever registered so
  // unregisterAll() can detach all of them from the EventBus.
  private handlers: Array<{ eventName: string; handler: EventHandler }> = []

  constructor(
    @inject(TYPES.NotificationService) private notificationService: NotificationService,
    @inject(TYPES.EventBus) private eventBus: EventBusService
  ) {}

  /**
   * Enregistrer tous les listeners
   */
  register(): void {
    this.registerUserCreatedListener()
    this.registerOrganizationInvitationCreatedListener()
    this.registerSubscriptionCreatedListener()
  }

  /**
   * Désinscrire tous les listeners
   */
  unregisterAll(): void {
    for (const { eventName, handler } of this.handlers) {
      this.eventBus.off(eventName, handler)
    }
    this.handlers = []
  }

  /**
   * Helper pour enregistrer un handler et le tracker
   */
  private registerHandler<T>(eventName: string, handler: EventHandler<T>): void {
    // EventEmitter only knows about the unparameterised EventHandler signature;
    // the generic version above is just for editor ergonomics.
    const erased = handler as EventHandler
    this.handlers.push({ eventName, handler: erased })
    this.eventBus.on(eventName, erased)
  }

  /**
   * Listener: user.created → Notification de bienvenue
   */
  private registerUserCreatedListener(): void {
    const handler: EventHandler<UserCreatedEvent> = async (data) => {
      try {
        const { record: user } = data

        if (!user || !user.id) {
          logger.warn('user.created event received with incomplete data')
          return
        }

        await this.notificationService.createNotification({
          userId: user.id,
          type: 'system.announcement',
          title: '👋 Bienvenue !',
          message: `Bienvenue ${user.fullName || user.email} ! Votre compte a été créé avec succès.`,
          data: {
            userId: user.id,
            createdAt: user.createdAt?.toISO() || new Date().toISOString(),
          },
        })

        logger.info(`📬 Welcome notification created for user ${user.id}`)
      } catch (error) {
        logger.error('Failed to create welcome notification', { error })
      }
    }

    this.registerHandler('user.created', handler)
  }

  /**
   * Listener: organizationinvitation.created → Notification d'invitation
   */
  private registerOrganizationInvitationCreatedListener(): void {
    const handler: EventHandler<OrganizationInvitationCreatedEvent> = async (data) => {
      try {
        const { record: invitation } = data

        if (!invitation || !invitation.id) {
          logger.warn('organizationinvitation.created event received with incomplete data')
          return
        }

        if (!invitation.organization) {
          await invitation.load('organization')
        }
        if (!invitation.invitedBy) {
          await invitation.load('invitedBy')
        }

        const userRepository = getService<UserRepository>(TYPES.UserRepository)
        const inviteeUser = await userRepository.findByEmail(invitation.email)

        if (!inviteeUser) {
          logger.info(
            `No user found with email ${invitation.email} - notification will be sent via email only`
          )
          return
        }

        const organizationName = invitation.organization?.name || 'une organisation'
        const inviterName =
          invitation.invitedBy?.fullName || invitation.invitedBy?.email || 'Un membre'

        await this.notificationService.createNotification({
          userId: inviteeUser.id,
          organizationId: invitation.organizationId,
          type: 'org.invitation',
          title: '📨 Nouvelle invitation',
          message: `${inviterName} vous invite à rejoindre ${organizationName}`,
          data: {
            invitationId: invitation.id,
            invitedById: invitation.invitedById,
            organizationId: invitation.organizationId,
            organizationName,
          },
        })

        logger.info(`📬 Invitation notification created for user ${inviteeUser.id}`)
      } catch (error) {
        logger.error('Failed to create invitation notification', { error })
      }
    }

    this.registerHandler('organizationinvitation.created', handler)
  }

  /**
   * Listener: subscription.created → Notification d'abonnement (envoyée à
   * tous les membres de l'organisation puisque l'abonnement est org-scoped).
   */
  private registerSubscriptionCreatedListener(): void {
    const handler: EventHandler<SubscriptionCreatedEvent> = async (data) => {
      try {
        const { record: subscription } = data

        if (!subscription || !subscription.id) {
          logger.warn('subscription.created event received with incomplete data')
          return
        }

        if (!subscription.plan) {
          await subscription.load('plan')
        }
        if (!subscription.organization) {
          await subscription.load('organization')
        }
        await subscription.organization?.load('users')

        const planName =
          subscription.plan?.nameI18n?.fr || subscription.plan?.nameI18n?.en || 'un plan'
        const members = subscription.organization?.users ?? []

        for (const member of members) {
          await this.notificationService.createNotification({
            userId: member.id,
            organizationId: subscription.organizationId,
            type: 'system.announcement',
            title: '🎉 Abonnement activé',
            message: `Votre abonnement ${planName} est maintenant actif !`,
            data: {
              subscriptionId: subscription.id,
              planId: subscription.planId,
              status: subscription.status,
            },
          })
        }

        logger.info(
          `📬 Subscription notification created for ${members.length} members of org ${subscription.organizationId}`
        )
      } catch (error) {
        logger.error('Failed to create subscription notification', { error })
      }
    }

    this.registerHandler('subscription.created', handler)
  }
}
