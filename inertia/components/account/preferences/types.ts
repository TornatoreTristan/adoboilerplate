export type NotificationType =
  | 'user.mentioned'
  | 'org.invitation'
  | 'org.member_joined'
  | 'org.member_left'
  | 'system.announcement'
  | 'system.maintenance'

export type NotificationChannel = 'in_app' | 'email' | 'push'

export interface NotificationPreference {
  id: string
  notification_type: NotificationType
  channel: NotificationChannel
  enabled: boolean
}

export interface CommunicationPreferences {
  newsletter_enabled: boolean
  tips_enabled: boolean
  promotional_offers_enabled: boolean
}
