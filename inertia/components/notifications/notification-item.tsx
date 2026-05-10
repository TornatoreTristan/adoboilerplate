import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/hooks/use-i18n'
import { getTranslation } from '@/lib/translatable'
import type { TranslatableField } from '@/lib/translatable'
import { formatDistanceToNow } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { Bell, Trash2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { router } from '@inertiajs/react'
import { useState } from 'react'

type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

interface NotificationAction {
  label: string
  labelI18n?: { fr: string; en: string }
  url?: string
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  endpoint?: string
  style?: 'primary' | 'secondary' | 'danger'
}

interface NotificationItemProps {
  notification: {
    id: string
    type: string
    priority: NotificationPriority
    titleI18n: TranslatableField
    messageI18n: TranslatableField
    data: Record<string, any> | null
    actions: NotificationAction[] | null
    readAt: string | null
    createdAt: string
  }
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}

export function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const { t, locale } = useI18n()
  const typedLocale = (locale || 'fr') as 'fr' | 'en'
  const dateLocale = typedLocale === 'fr' ? fr : enUS
  const [executingAction, setExecutingAction] = useState<number | null>(null)

  const getPriorityConfig = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent':
        return {
          icon: AlertCircle,
          badgeVariant: 'destructive' as const,
          iconColor: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-500/10',
        }
      case 'high':
        return {
          icon: AlertTriangle,
          badgeVariant: 'default' as const,
          iconColor: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-500/10',
        }
      case 'low':
        return {
          icon: Info,
          badgeVariant: 'secondary' as const,
          iconColor: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-500/10',
        }
      default: // normal
        return {
          icon: Bell,
          badgeVariant: 'outline' as const,
          iconColor: notification.readAt
            ? 'text-muted-foreground'
            : 'text-green-600 dark:text-green-400',
          bgColor: notification.readAt ? 'bg-muted/50' : 'bg-green-500/10',
        }
    }
  }

  const handleActionClick = async (action: NotificationAction, index: number) => {
    if (executingAction !== null) return

    setExecutingAction(index)

    try {
      if (action.endpoint) {
        const response = await fetch(`/api/notifications/${notification.id}/actions/${index}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        if (response.ok) {
          router.reload()
        }
      } else if (action.url) {
        router.visit(action.url)
      }
    } catch (error) {
      console.error('Failed to execute action:', error)
    } finally {
      setExecutingAction(null)
    }
  }

  const priorityConfig = getPriorityConfig(notification.priority)
  const PriorityIcon = priorityConfig.icon

  return (
    <div
      className={`group flex gap-6 p-6 transition-colors border-none ${
        !notification.readAt ? 'bg-accent/10 hover:bg-accent/10' : 'hover:bg-accent/5'
      }`}
    >
      <div className="relative flex-shrink-0">
        {!notification.readAt && notification.priority !== 'urgent' && (
          <span className="absolute -left-1 -top-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        )}
        {notification.priority === 'urgent' && !notification.readAt && (
          <span className="absolute -left-1 -top-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg ${priorityConfig.bgColor} ${priorityConfig.iconColor}`}
        >
          <PriorityIcon className="h-5 w-5" />
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={`text-sm font-semibold leading-tight ${!notification.readAt ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              {getTranslation(notification.titleI18n, typedLocale)}
            </h4>
            {notification.priority !== 'normal' && (
              <Badge variant={priorityConfig.badgeVariant} className="text-[10px] px-1.5 py-0">
                {t(`notifications.priority.${notification.priority}`)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <time className="text-xs text-muted-foreground/70 whitespace-nowrap">
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
                locale: dateLocale,
              })}
            </time>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(notification.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/90 leading-relaxed">
          {getTranslation(notification.messageI18n, typedLocale)}
        </p>

        {notification.actions && notification.actions.length > 0 && (
          <div className="flex gap-2 pt-2 flex-wrap">
            {notification.actions.map((action, index) => {
              const isExecuting = executingAction === index
              const actionLabel = action.labelI18n
                ? getTranslation(action.labelI18n, typedLocale)
                : action.label

              const getVariant = (): 'default' | 'secondary' | 'destructive' => {
                if (action.style === 'primary') return 'default'
                if (action.style === 'danger') return 'destructive'
                return 'secondary'
              }

              return (
                <Button
                  key={index}
                  size="sm"
                  variant={getVariant()}
                  className="h-8 text-xs"
                  onClick={() => handleActionClick(action, index)}
                  disabled={isExecuting}
                >
                  {isExecuting ? t('notifications.action_executing') : actionLabel}
                </Button>
              )
            })}
          </div>
        )}

        {!notification.readAt && (
          <div className="pt-1">
            <Button
              size="sm"
              className="h-8 text-xs transition-opacity"
              onClick={() => onMarkAsRead(notification.id)}
            >
              {t('notifications.mark_read')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
