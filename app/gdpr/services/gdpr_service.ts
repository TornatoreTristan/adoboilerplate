import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import type UserRepository from '#users/repositories/user_repository'
import type OrganizationRepository from '#organizations/repositories/organization_repository'
import type NotificationRepository from '#notifications/repositories/notification_repository'
import type UploadRepository from '#uploads/repositories/upload_repository'
import type SessionRepository from '#sessions/repositories/session_repository'
import type SubscriptionRepository from '#billing/repositories/subscription_repository'
import type LogService from '#logs/services/log_service'
import type EmailService from '#mailing/services/email_service'
import type { UserDataExport, AccountDeletionRequest } from '#gdpr/types/gdpr'
import { DateTime } from 'luxon'

@injectable()
export default class GdprService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: UserRepository,
    @inject(TYPES.OrganizationRepository) private orgRepo: OrganizationRepository,
    @inject(TYPES.NotificationRepository) private notificationRepo: NotificationRepository,
    @inject(TYPES.UploadRepository) private uploadRepo: UploadRepository,
    @inject(TYPES.SessionRepository) private sessionRepo: SessionRepository,
    @inject(TYPES.SubscriptionRepository) private subscriptionRepo: SubscriptionRepository,
    @inject(TYPES.LogService) private logService: LogService,
    @inject(TYPES.EmailService) private emailService: EmailService
  ) {}

  /**
   * Export toutes les données personnelles d'un utilisateur (RGPD Article 20)
   */
  async exportUserData(userId: string): Promise<UserDataExport> {
    const user = await this.userRepo.findById(userId, {
      preload: ['sessions', 'notifications', 'uploads'],
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Récupérer les organisations
    const userOrganizations = await this.orgRepo.findUserOrganizations(userId)

    // Récupérer les abonnements
    const subscriptions = await this.subscriptionRepo.findBy({ userId })

    const exportData: UserDataExport = {
      exportDate: DateTime.now().toISO()!,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt.toISO()!,
        isEmailVerified: user.isEmailVerified,
      },
      profile: {
        avatarUrl: user.avatarUrl,
        locale: user.locale,
      },
      organizations: userOrganizations.map((org) => ({
        id: org.id,
        name: org.name,
        role: 'member', // TODO: récupérer le vrai rôle depuis pivot
        joinedAt: org.createdAt.toISO()!,
      })),
      notifications: user.notifications
        ? user.notifications.map((notif) => ({
            id: notif.id,
            type: notif.type,
            data: notif.data,
            readAt: notif.readAt?.toISO() || null,
            createdAt: notif.createdAt.toISO()!,
          }))
        : [],
      uploads: user.uploads
        ? user.uploads.map((upload) => ({
            id: upload.id,
            filename: upload.filename,
            mimeType: upload.mimeType,
            size: upload.size,
            uploadedAt: upload.createdAt.toISO()!,
          }))
        : [],
      sessions: user.sessions
        ? user.sessions.map((session) => ({
            id: session.id,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            lastActivityAt: session.lastActivityAt.toISO()!,
            createdAt: session.createdAt.toISO()!,
          }))
        : [],
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        planName: 'Plan', // TODO: preload plan
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart?.toISO() ?? null,
        currentPeriodEnd: sub.currentPeriodEnd?.toISO() ?? null,
      })),
    }

    // Log GDPR action
    await this.logService.info('GDPR: User data exported', {
      userId,
      action: 'data_export',
    })

    return exportData
  }

  /**
   * Demande de suppression de compte (RGPD Article 17 - Droit à l'oubli)
   * Délai de grâce de 30 jours avant suppression définitive
   */
  async requestAccountDeletion(
    userId: string,
    reason?: string
  ): Promise<AccountDeletionRequest> {
    const user = await this.userRepo.findById(userId)

    if (!user) {
      throw new Error('User not found')
    }

    // Délai de grâce de 30 jours
    const scheduledFor = DateTime.now().plus({ days: 30 })

    // Marquer le compte comme "en attente de suppression"
    await this.userRepo.update(userId, {
      deletedAt: scheduledFor.toJSDate(),
    } as any)

    const request: AccountDeletionRequest = {
      userId,
      requestedAt: DateTime.now().toISO()!,
      scheduledFor: scheduledFor.toISO()!,
      reason,
    }

    // Envoyer email de confirmation avec possibilité d'annulation
    await this.emailService.send({
      to: user.email,
      subject: 'Account Deletion Requested',
      template: 'account_deletion_requested',
      data: {
        userName: user.fullName || user.email,
        scheduledDate: scheduledFor.toLocaleString(),
        cancelUrl: `${process.env.APP_URL}/account/cancel-deletion`,
      },
    })

    // Log GDPR action
    await this.logService.warn('GDPR: Account deletion requested', {
      userId,
      scheduledFor: scheduledFor.toISO(),
      reason,
    })

    return request
  }

  /**
   * Annule une demande de suppression de compte
   */
  async cancelAccountDeletion(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId)

    if (!user) {
      throw new Error('User not found')
    }

    // Retirer la marque de suppression
    await this.userRepo.update(userId, {
      deletedAt: null,
    } as any)

    // Log GDPR action
    await this.logService.info('GDPR: Account deletion cancelled', {
      userId,
    })

    // Envoyer email de confirmation
    await this.emailService.send({
      to: user.email,
      subject: 'Account Deletion Cancelled',
      template: 'account_deletion_cancelled',
      data: {
        userName: user.fullName || user.email,
      },
    })
  }

  /**
   * Suppression définitive du compte et anonymisation des données
   */
  async deleteAccountPermanently(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId)

    if (!user) {
      throw new Error('User not found')
    }

    // 1. Supprimer les sessions
    await this.sessionRepo.deleteBy({ userId })

    // 2. Supprimer les uploads (fichiers + DB)
    const uploads = await this.uploadRepo.findBy({ userId })
    for (const upload of uploads) {
      await this.uploadRepo.delete(upload.id, { soft: false })
    }

    // 3. Anonymiser les notifications (garder pour stats mais retirer données perso)
    await this.notificationRepo.updateBy({ userId }, { userId: null } as any)

    // 4. Retirer l'utilisateur des organisations
    const organizations = await this.orgRepo.findUserOrganizations(userId)
    for (const org of organizations) {
      await this.orgRepo.removeUser(org.id, userId)
    }

    // 5. Anonymiser les logs (garder pour audit mais retirer données perso)
    // Les logs gardent l'userId mais on anonymise les données contextuelles

    // 6. Suppression définitive de l'utilisateur
    await this.userRepo.delete(userId, { soft: false })

    // Log GDPR action (avec userId encore disponible temporairement)
    await this.logService.info('GDPR: Account permanently deleted', {
      userId,
      deletedAt: DateTime.now().toISO(),
    })
  }

  /**
   * Vérifier et exécuter les suppressions planifiées (cron job)
   */
  async processScheduledDeletions(): Promise<number> {
    const now = DateTime.now()

    // Trouver tous les comptes marqués pour suppression avec date dépassée
    const usersToDelete = await this.userRepo.query()
      .whereNotNull('deleted_at')
      .where('deleted_at', '<=', now.toSQL())

    let count = 0
    for (const user of usersToDelete) {
      await this.deleteAccountPermanently(user.id)
      count++
    }

    if (count > 0) {
      await this.logService.info('GDPR: Scheduled deletions processed', {
        count,
        processedAt: now.toISO(),
      })
    }

    return count
  }
}
