import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import type EmailService from '#mailing/services/email_service'

export default class TestMail extends BaseCommand {
  static commandName = 'mail:test'
  static description = 'Send a test email to verify email configuration'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'Recipient email address' })
  declare recipient: string

  @flags.string({ description: 'Email subject (optional)' })
  declare subject?: string

  async run() {
    const { getService } = await import('#shared/container/container')
    const { TYPES } = await import('#shared/container/types')

    const emailService = getService<EmailService>(TYPES.EmailService)

    this.logger.info(`Sending test email to ${this.recipient}...`)

    try {
      await emailService.send({
        to: this.recipient,
        subject: this.subject || 'Email de test',
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h1 style="color: #333;">Email de test</h1>
              <p>Ceci est un email de test envoyé depuis votre application AdonisJS.</p>
              <p>Si vous recevez cet email, la configuration est correcte ! 🎉</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 12px;">
                Envoyé le ${new Date().toLocaleString('fr-FR')}
              </p>
            </body>
          </html>
        `,
        tags: { category: 'test' },
      })

      this.logger.success(`Test email sent successfully to ${this.recipient}`)
      this.logger.info('Check /admin/mails to see the email log')
    } catch (error) {
      this.logger.error('Failed to send test email')
      this.logger.error(error.message)
    }
  }
}
