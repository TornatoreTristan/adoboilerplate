import { injectable } from 'inversify'
import nodemailer, { type Transporter } from 'nodemailer'
import env from '#start/env'
import type { MailDispatchResult, MailMessage, MailProvider } from './mail_provider.js'
import type { EmailAddress } from '#mailing/types/email'

@injectable()
export default class SmtpMailProvider implements MailProvider {
  readonly name = 'smtp'

  private transporter: Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.get('MAIL_SMTP_HOST'),
      port: env.get('MAIL_SMTP_PORT'),
      secure: env.get('MAIL_SMTP_SECURE'),
      auth: {
        user: env.get('MAIL_SMTP_USER'),
        pass: env.get('MAIL_SMTP_PASSWORD'),
      },
    })
  }

  async send(message: MailMessage): Promise<MailDispatchResult> {
    const info = await this.transporter.sendMail({
      from: this.formatAddress(message.from),
      to: this.formatRecipients(message.to),
      cc: message.cc ? this.formatRecipients(message.cc) : undefined,
      bcc: message.bcc ? this.formatRecipients(message.bcc) : undefined,
      replyTo: message.replyTo ? this.formatAddress(message.replyTo) : undefined,
      subject: message.subject,
      html: message.html,
      text: message.text,
      attachments: message.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
      headers: this.buildHeaders(message),
    })

    return {
      id: info.messageId,
      accepted: this.toAddressList(info.accepted),
      rejected: this.toAddressList(info.rejected),
    }
  }

  private formatAddress(value: EmailAddress | string): string {
    if (typeof value === 'string') return value
    return value.name ? `${value.name} <${value.email}>` : value.email
  }

  private formatRecipients(
    value: EmailAddress | EmailAddress[] | string | string[]
  ): string | string[] {
    if (Array.isArray(value)) {
      return value.map((entry) => this.formatAddress(entry))
    }
    return this.formatAddress(value)
  }

  private buildHeaders(message: MailMessage): Record<string, string> | undefined {
    const headers: Record<string, string> = { ...(message.headers || {}) }

    if (message.tags) {
      for (const [key, val] of Object.entries(message.tags)) {
        headers[`X-Mail-Tag-${key}`] = val
      }
    }

    return Object.keys(headers).length ? headers : undefined
  }

  private toAddressList(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined
    return value.map((entry) =>
      typeof entry === 'string' ? entry : (entry as { address: string }).address
    )
  }
}
