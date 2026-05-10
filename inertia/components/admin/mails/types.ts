export type EmailStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'delivery_delayed'
  | 'bounced'
  | 'complained'
  | 'opened'
  | 'clicked'
  | 'failed'
  | 'received'

export interface EmailLog {
  id: string
  userId: string | null
  recipient: string
  subject: string
  category: string
  status: EmailStatus
  providerId: string | null
  errorMessage: string | null
  opensCount: number
  clicksCount: number
  openedAt: string | null
  clickedAt: string | null
  sentAt: string | null
  deliveredAt: string | null
  failedAt: string | null
  createdAt: string
  hasAttachments: boolean
}

export interface EmailLogsStats {
  total: number
  sent: number
  failed: number
  delivered: number
  pending: number
  byCategory: { category: string; count: number }[]
}

export interface MailsFilters {
  status?: string
  category?: string
  search?: string
}

export interface MailsLogsPayload {
  data: EmailLog[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}
