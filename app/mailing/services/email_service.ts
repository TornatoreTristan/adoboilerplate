import { injectable, inject } from 'inversify'
import { render } from '@react-email/render'
import i18nManager from '@adonisjs/i18n/services/main'
import env from '#start/env'
import { TYPES } from '#shared/container/types'
import type QueueService from '#shared/services/queue_service'
import type EmailLogRepository from '#mailing/repositories/email_log_repository'
import type { MailProvider } from '#mailing/providers/mail_provider'
import type {
  SendEmailData,
  EmailResult,
  WelcomeEmailData,
  PasswordResetEmailData,
  OrganizationInvitationEmailData,
  QueueEmailData,
  SupportedLocale,
  WelcomeEmailTranslations,
  PasswordResetEmailTranslations,
  OrganizationInvitationEmailTranslations,
} from '#mailing/types/email'

@injectable()
export default class EmailService {
  constructor(
    @inject(TYPES.QueueService) private queueService: QueueService,
    @inject(TYPES.EmailLogRepository) private emailLogRepo: EmailLogRepository,
    @inject(TYPES.MailProvider) private mailProvider: MailProvider
  ) {}

  async send(emailData: SendEmailData, userId?: string): Promise<EmailResult> {
    const firstTo = Array.isArray(emailData.to) ? emailData.to[0] : emailData.to
    const recipient = typeof firstTo === 'string' ? firstTo : firstTo.email

    const category = emailData.tags?.category || 'general'

    const attachmentsMetadata =
      emailData.attachments?.map((att) => ({
        filename: att.filename,
        contentType: att.contentType || 'application/octet-stream',
        size: Buffer.isBuffer(att.content) ? att.content.length : undefined,
      })) || null

    const metadata = {
      tags: emailData.tags || {},
      cc: emailData.cc,
      bcc: emailData.bcc,
      replyTo: emailData.replyTo,
    }

    const log = await this.emailLogRepo.create({
      userId: userId || null,
      recipient,
      subject: emailData.subject,
      category,
      status: 'pending',
      metadata,
      attachmentsMetadata,
    })

    try {
      let html = emailData.html

      if (emailData.react) {
        html = await render(emailData.react)
      }

      const result = await this.mailProvider.send({
        from: {
          email: env.get('EMAIL_FROM_ADDRESS'),
          name: env.get('EMAIL_FROM_NAME'),
        },
        to: emailData.to,
        subject: emailData.subject,
        html,
        text: emailData.text,
        replyTo: emailData.replyTo,
        cc: emailData.cc,
        bcc: emailData.bcc,
        attachments: emailData.attachments,
        tags: emailData.tags,
      })

      await this.emailLogRepo.updateStatus(log.id, 'sent')
      await this.emailLogRepo.update(log.id, { providerId: result.id })

      return {
        id: result.id,
        success: true,
      }
    } catch (error) {
      await this.emailLogRepo.updateStatus(log.id, 'failed')
      await this.emailLogRepo.update(log.id, { errorMessage: error.message })

      return {
        id: '',
        success: false,
        error: error.message,
      }
    }
  }

  async queue(
    emailData: QueueEmailData,
    options?: { priority?: number; delay?: number }
  ): Promise<void> {
    await this.queueService.add(
      'emails',
      'send-email',
      { emailData },
      {
        priority: options?.priority,
        delay: options?.delay,
      }
    )
  }

  buildWelcomeTranslations(
    locale: SupportedLocale,
    vars: { userName: string }
  ): WelcomeEmailTranslations {
    const i18n = i18nManager.locale(locale)
    return {
      subject: i18n.t('emails.welcome.subject', vars),
      preview: i18n.t('emails.welcome.preview', vars),
      heading: i18n.t('emails.welcome.heading', vars),
      body: i18n.t('emails.welcome.body', vars),
      cta: i18n.t('emails.welcome.cta', vars),
      helper: i18n.t('emails.welcome.helper', vars),
      footer: i18n.t('emails.welcome.footer', vars),
    }
  }

  buildPasswordResetTranslations(
    locale: SupportedLocale,
    vars: { userName: string; expiresIn: string }
  ): PasswordResetEmailTranslations {
    const i18n = i18nManager.locale(locale)
    return {
      subject: i18n.t('emails.password_reset.subject', vars),
      preview: i18n.t('emails.password_reset.preview', vars),
      heading: i18n.t('emails.password_reset.heading', vars),
      greeting: i18n.t('emails.password_reset.greeting', vars),
      body: i18n.t('emails.password_reset.body', vars),
      cta: i18n.t('emails.password_reset.cta', vars),
      expires: i18n.t('emails.password_reset.expires', vars),
      footer: i18n.t('emails.password_reset.footer', vars),
    }
  }

  buildOrganizationInvitationTranslations(
    locale: SupportedLocale,
    vars: { inviterName: string; organizationName: string; roleLabel: string; expiresAt: string }
  ): OrganizationInvitationEmailTranslations {
    const i18n = i18nManager.locale(locale)
    return {
      subject: i18n.t('emails.organization_invitation.subject', vars),
      preview: i18n.t('emails.organization_invitation.preview', vars),
      heading: i18n.t('emails.organization_invitation.heading', vars),
      body: i18n.t('emails.organization_invitation.body', vars),
      cta: i18n.t('emails.organization_invitation.cta', vars),
      expires: i18n.t('emails.organization_invitation.expires', vars),
      footer: i18n.t('emails.organization_invitation.footer', vars),
    }
  }

  private resolveRoleLabel(locale: SupportedLocale, role: string): string {
    const i18n = i18nManager.locale(locale)
    const knownRoles = ['owner', 'admin', 'member']
    if (knownRoles.includes(role)) {
      return i18n.t(`emails.organization_invitation.role.${role}`)
    }
    return role
  }

  async sendWelcomeEmail(
    to: string,
    locale: SupportedLocale,
    data: WelcomeEmailData
  ): Promise<EmailResult> {
    const { default: WelcomeEmail } = await import('../../../inertia/emails/welcome_email.js')
    const translations = this.buildWelcomeTranslations(locale, { userName: data.userName })
    return this.send({
      to,
      subject: translations.subject,
      react: WelcomeEmail({ translations, loginUrl: data.loginUrl }),
      tags: { category: 'welcome' },
    })
  }

  async sendPasswordResetEmail(
    to: string,
    locale: SupportedLocale,
    data: PasswordResetEmailData
  ): Promise<EmailResult> {
    const { default: PasswordResetEmail } =
      await import('../../../inertia/emails/password_reset_email.js')
    const translations = this.buildPasswordResetTranslations(locale, {
      userName: data.userName,
      expiresIn: data.expiresIn,
    })
    return this.send({
      to,
      subject: translations.subject,
      react: PasswordResetEmail({ translations, resetUrl: data.resetUrl }),
      tags: { category: 'password-reset' },
    })
  }

  async sendOrganizationInvitationEmail(
    to: string,
    locale: SupportedLocale,
    data: OrganizationInvitationEmailData
  ): Promise<EmailResult> {
    const { default: OrganizationInvitationEmail } =
      await import('../../../inertia/emails/organization_invitation_email.js')
    const roleLabel = this.resolveRoleLabel(locale, data.role)
    const translations = this.buildOrganizationInvitationTranslations(locale, {
      inviterName: data.inviterName,
      organizationName: data.organizationName,
      roleLabel,
      expiresAt: data.expiresAt,
    })
    return this.send({
      to,
      subject: translations.subject,
      react: OrganizationInvitationEmail({ translations, invitationUrl: data.invitationUrl }),
      tags: { category: 'organization-invite' },
    })
  }

  async queueWelcomeEmail(
    to: string,
    locale: SupportedLocale,
    data: WelcomeEmailData
  ): Promise<void> {
    const { default: WelcomeEmail } = await import('../../../inertia/emails/welcome_email.js')
    const translations = this.buildWelcomeTranslations(locale, { userName: data.userName })
    await this.queue(
      {
        to,
        subject: translations.subject,
        react: WelcomeEmail({ translations, loginUrl: data.loginUrl }),
        tags: { category: 'welcome' },
      },
      { priority: 0 }
    )
  }

  async queuePasswordResetEmail(
    to: string,
    locale: SupportedLocale,
    data: PasswordResetEmailData
  ): Promise<void> {
    const { default: PasswordResetEmail } =
      await import('../../../inertia/emails/password_reset_email.js')
    const translations = this.buildPasswordResetTranslations(locale, {
      userName: data.userName,
      expiresIn: data.expiresIn,
    })
    await this.queue(
      {
        to,
        subject: translations.subject,
        react: PasswordResetEmail({ translations, resetUrl: data.resetUrl }),
        tags: { category: 'password-reset' },
      },
      { priority: 1 }
    )
  }

  async queueOrganizationInvitationEmail(
    to: string,
    locale: SupportedLocale,
    data: OrganizationInvitationEmailData
  ): Promise<void> {
    const { default: OrganizationInvitationEmail } =
      await import('../../../inertia/emails/organization_invitation_email.js')
    const roleLabel = this.resolveRoleLabel(locale, data.role)
    const translations = this.buildOrganizationInvitationTranslations(locale, {
      inviterName: data.inviterName,
      organizationName: data.organizationName,
      roleLabel,
      expiresAt: data.expiresAt,
    })
    await this.queue(
      {
        to,
        subject: translations.subject,
        react: OrganizationInvitationEmail({ translations, invitationUrl: data.invitationUrl }),
        tags: { category: 'organization-invite' },
      },
      { priority: 1 }
    )
  }
}
