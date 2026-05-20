import { Head, router } from '@inertiajs/react'
import AppLayout from '@/components/layouts/app-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/hooks/use-i18n'
import type { TranslatableField } from '@/lib/translatable'
import { CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { NotificationsList } from '@/components/notifications/notifications-list'

interface Notification {
  id: string
  type: string
  titleI18n: TranslatableField
  messageI18n: TranslatableField
  data: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
}

interface NotificationsPageProps {
  notifications: Notification[]
  unreadCount: number
}

export default function NotificationsPage({ notifications, unreadCount }: NotificationsPageProps) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all')
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const unreadNotifications = notifications.filter((n) => !n.readAt)
  const readNotifications = notifications.filter((n) => n.readAt)

  const displayedNotifications =
    activeTab === 'unread'
      ? unreadNotifications
      : activeTab === 'read'
        ? readNotifications
        : notifications

  const markAsRead = (notificationId: string) => {
    if (processingIds.has(notificationId)) return

    setProcessingIds((prev) => new Set(prev).add(notificationId))
    router.patch(
      `/api/notifications/${notificationId}/read`,
      {},
      {
        preserveScroll: true,
        onFinish: () => {
          setProcessingIds((prev) => {
            const next = new Set(prev)
            next.delete(notificationId)
            return next
          })
        },
      }
    )
  }

  const markAllAsRead = () => {
    router.patch('/api/notifications/mark-all-read', {}, { preserveScroll: true })
  }

  const deleteNotification = (notificationId: string) => {
    if (processingIds.has(notificationId)) return

    setProcessingIds((prev) => new Set(prev).add(notificationId))
    router.delete(`/api/notifications/${notificationId}`, {
      preserveScroll: true,
      onFinish: () => {
        setProcessingIds((prev) => {
          const next = new Set(prev)
          next.delete(notificationId)
          return next
        })
      },
    })
  }

  return (
    <>
      <Head title={t('notifications.title')} />
      <AppLayout>
        <div className="flex flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{t('notifications.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('notifications.description')}</p>
            </div>
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline">
                <CheckCheck className="mr-2 h-4 w-4" />
                {t('notifications.mark_all_read')}
              </Button>
            )}
          </div>

          <div className="border-b">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('all')}
                className={`relative pb-4 text-sm font-medium transition-colors hover:text-foreground ${
                  activeTab === 'all' ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {t('notifications.all')}
                <Badge variant="secondary" className="ml-2">
                  {notifications.length}
                </Badge>
                {activeTab === 'all' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('unread')}
                className={`relative pb-4 text-sm font-medium transition-colors hover:text-foreground ${
                  activeTab === 'unread' ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {t('notifications.unread')}
                {unreadNotifications.length > 0 && (
                  <Badge className="ml-2">{unreadNotifications.length}</Badge>
                )}
                {activeTab === 'unread' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('read')}
                className={`relative pb-4 text-sm font-medium transition-colors hover:text-foreground ${
                  activeTab === 'read' ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {t('notifications.read')}
                <Badge variant="secondary" className="ml-2">
                  {readNotifications.length}
                </Badge>
                {activeTab === 'read' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
                )}
              </button>
            </div>
          </div>

          <NotificationsList
            notifications={displayedNotifications}
            onMarkAsRead={markAsRead}
            onDelete={deleteNotification}
          />
        </div>
      </AppLayout>
    </>
  )
}
