import type { ReactElement } from 'react'

export interface EmailAddress {
  email: string
  name?: string
}

export interface EmailAttachment {
  filename: string
  content: Buffer | string
  contentType?: string
}

export interface SendEmailData {
  to: EmailAddress | EmailAddress[] | string | string[]
  subject: string
  html?: string
  text?: string
  react?: ReactElement
  replyTo?: EmailAddress | string
  cc?: EmailAddress | EmailAddress[] | string | string[]
  bcc?: EmailAddress | EmailAddress[] | string | string[]
  attachments?: EmailAttachment[]
  tags?: Record<string, string>
}

export interface QueueEmailData extends SendEmailData {
  priority?: 'low' | 'normal' | 'high'
  delay?: number
}

export interface EmailResult {
  id: string
  success: boolean
  error?: string
}

export type EmailTemplate =
  | 'welcome'
  | 'password-reset'
  | 'organization-invite'
  | 'session-alert'

export interface WelcomeEmailData {
  userName: string
  loginUrl: string
}

export interface PasswordResetEmailData {
  userName: string
  resetUrl: string
  expiresIn: string
}

export interface OrganizationInviteEmailData {
  organizationName: string
  inviterName: string
  role: string
  invitationUrl: string
  expiresAt: string
}

export interface SessionAlertEmailData {
  userName: string
  deviceInfo: string
  location: string
  timestamp: string
  secureAccountUrl: string
}