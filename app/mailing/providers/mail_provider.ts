import type { EmailAddress, EmailAttachment } from '#mailing/types/email'

export interface MailMessage {
  from: EmailAddress
  to: EmailAddress | EmailAddress[] | string | string[]
  subject: string
  html?: string
  text?: string
  replyTo?: EmailAddress | string
  cc?: EmailAddress | EmailAddress[] | string | string[]
  bcc?: EmailAddress | EmailAddress[] | string | string[]
  attachments?: EmailAttachment[]
  headers?: Record<string, string>
  tags?: Record<string, string>
}

export interface MailDispatchResult {
  id: string
  accepted?: string[]
  rejected?: string[]
}

export interface MailProvider {
  readonly name: string

  send(message: MailMessage): Promise<MailDispatchResult>
}
