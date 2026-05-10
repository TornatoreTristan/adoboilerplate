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
import User from '#users/models/user'
import { DateTime } from 'luxon'
import env from '#start/env'
import { E } from '#shared/exceptions/index'

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
    const user = await this.userRepo.findById(userId)
    if (!user) {
      E.userNotFound(userId)
    }

    const [userOrganizations, notifications, uploads, sessions, subscriptions] = await Promise.all([
      this.orgRepo.findByUserId(userId),
      this.notificationRepo.findByUserId(userId),
      this.uploadRepo.findByUserId(userId),
      this.sessionRepo.findByUserId(userId),
      this.subscriptionRepo.findBy({ userId }),
    ])

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
        // The User model does not currently carry a locale column. Once it does,
        // wire it up here.
        locale: null,
      },
      organizations: userOrganizations.map((org) => ({
        id: org.id,
        name: org.name,
        role: org.pivot_role,
        joinedAt: org.createdAt.toISO()!,
      })),
      notifications: notifications.map((notif) => ({
        id: notif.id,
        type: notif.type,
        data: notif.data ?? {},
        readAt: notif.readAt?.toISO() || null,
        createdAt: notif.createdAt.toISO()!,
      })),
      uploads: uploads.map((upload) => ({
        id: upload.id,
        filename: upload.filename,
        mimeType: upload.mimeType,
        size: upload.size,
        uploadedAt: upload.createdAt.toISO()!,
      })),
      sessions: sessions.map((session) => ({
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        lastActivityAt: session.lastActivity.toISO()!,
        createdAt: session.createdAt.toISO()!,
      })),
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        planName: 'Plan',
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart?.toISO() ?? null,
        currentPeriodEnd: sub.currentPeriodEnd?.toISO() ?? null,
      })),
    }

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
  async requestAccountDeletion(userId: string, reason?: string): Promise<AccountDeletionRequest> {
    const user = await this.userRepo.findById(userId)
    if (!user) {
      E.userNotFound(userId)
    }

    const scheduledFor = DateTime.now().plus({ days: 30 })

    await this.userRepo.update(userId, {
      deleted_at: scheduledFor,
    } as any)

    const request: AccountDeletionRequest = {
      userId,
      requestedAt: DateTime.now().toISO()!,
      scheduledFor: scheduledFor.toISO()!,
      reason,
    }

    const cancelUrl = `${env.get('APP_URL', '')}/account/cancel-deletion`
    await this.emailService.send({
      to: user.email,
      subject: 'Account Deletion Requested',
      text:
        `Hello ${user.fullName || user.email},\n\n` +
        `Your account is scheduled for deletion on ${scheduledFor.toLocaleString(DateTime.DATETIME_FULL)}.\n` +
        `If you change your mind, cancel the request here: ${cancelUrl}\n`,
    })

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
      E.userNotFound(userId)
    }

    await this.userRepo.update(userId, {
      deleted_at: null,
    } as any)

    await this.logService.info('GDPR: Account deletion cancelled', { userId })

    await this.emailService.send({
      to: user.email,
      subject: 'Account Deletion Cancelled',
      text:
        `Hello ${user.fullName || user.email},\n\n` +
        `Your scheduled account deletion has been cancelled. Your account remains active.\n`,
    })
  }

  /**
   * Suppression définitive du compte et anonymisation des données
   */
  async deleteAccountPermanently(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId)
    if (!user) {
      E.userNotFound(userId)
    }

    // 1. Sessions
    const sessions = await this.sessionRepo.findByUserId(userId)
    for (const session of sessions) {
      await this.sessionRepo.delete(session.id, { soft: false })
    }

    // 2. Uploads (fichiers + DB)
    const uploads = await this.uploadRepo.findByUserId(userId)
    for (const upload of uploads) {
      await this.uploadRepo.delete(upload.id, { soft: false })
    }

    // 3. Notifications (anonymise pour conserver les stats)
    const notifications = await this.notificationRepo.findByUserId(userId)
    for (const notif of notifications) {
      await this.notificationRepo.update(notif.id, { userId: null } as any)
    }

    // 4. Memberships
    const organizations = await this.orgRepo.findByUserId(userId)
    for (const org of organizations) {
      await this.orgRepo.removeUser(org.id, userId)
    }

    // 5. Logs : conservés pour audit, déjà sans données perso au-delà de l'userId.

    // 6. Suppression définitive
    await this.userRepo.delete(userId, { soft: false })

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

    const usersToDelete = await User.query()
      .whereNotNull('deleted_at')
      .where('deleted_at', '<=', now.toSQL() ?? now.toISO()!)

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
