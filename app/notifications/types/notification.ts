export interface CreateNotificationData {
  userId: string
  organizationId?: string | null
  type: NotificationType
  priority?: NotificationPriority
  title: string
  message: string
  data?: Record<string, any> | null
  actions?: NotificationAction[] | null
}

export interface UpdateNotificationData {
  readAt?: Date | null
}

export interface NotificationFilters {
  userId?: string
  organizationId?: string
  type?: NotificationType
  isRead?: boolean
  isUnread?: boolean
}

export type NotificationType =
  | 'user.mentioned'
  | 'org.invitation'
  | 'org.member_joined'
  | 'org.member_left'
  | 'system.announcement'
  | 'system.maintenance'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface NotificationAction {
  label: string
  labelI18n?: { fr: string; en: string }
  url?: string
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  endpoint?: string
  style?: 'primary' | 'secondary' | 'danger'
}

export interface NotificationData {
  [key: string]: unknown
}
