import { useEffect, useState, useRef } from 'react'
import { usePage } from '@inertiajs/react'
import { toast } from 'sonner'
import { getTransmitInstance } from '@/lib/transmit'

export interface Notification {
  id: string
  type: string
  titleI18n: { fr: string; en: string }
  messageI18n: { fr: string; en: string }
  data: Record<string, any> | null
  readAt: string | null
  createdAt: string
}

export interface NotificationEvent {
  type: 'notification:new' | 'notification:read'
  notification?: Notification
  notificationId?: string
}

/**
 * Hook React pour gérer les notifications en temps réel via Transmit (SSE)
 *
 * Features:
 * - Connexion automatique au canal Transmit de l'utilisateur
 * - Mise à jour en temps réel des notifications
 * - Toast notifications pour les nouveaux messages
 * - Compteur de notifications non lues
 * - Cleanup automatique à la déconnexion
 */
export function useNotifications() {
  const { auth, i18n } = usePage<{
    auth: { user: { id: string } | null }
    i18n: { locale: string }
  }>().props
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const localeRef = useRef(i18n.locale)

  // Sync locale ref
  useEffect(() => {
    localeRef.current = i18n.locale
  }, [i18n.locale])

  // Charger le compteur initial au mount
  useEffect(() => {
    if (!auth.user) return

    // Charger le nombre de notifications non lues au démarrage
    fetch('/api/notifications/unread-count', {
      credentials: 'include', // Inclure les cookies de session
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.unreadCount !== undefined) {
          setUnreadCount(data.unreadCount)
        }
      })
      .catch((error) => {
        console.error('Failed to fetch initial unread count:', error)
      })
  }, [auth.user])

  useEffect(() => {
    if (!auth.user) return

    const transmit = getTransmitInstance()
    const channelName = `user/${auth.user.id}/notifications`
    const subscription = transmit.subscription(channelName)

    const stopListening = subscription.onMessage((payload: NotificationEvent) => {
      if (payload.type === 'notification:new' && payload.notification) {
        const newNotification = payload.notification

        setNotifications((prev) => [newNotification, ...prev])

        if (!newNotification.readAt) {
          setUnreadCount((prev) => prev + 1)
        }

        const currentLocale = (localeRef.current || 'fr') as 'fr' | 'en'
        const title =
          newNotification.titleI18n[currentLocale] ||
          newNotification.titleI18n.fr ||
          newNotification.titleI18n.en
        const message =
          newNotification.messageI18n[currentLocale] ||
          newNotification.messageI18n.fr ||
          newNotification.messageI18n.en

        toast.info(title, {
          description: message,
          duration: 5000,
        })
      }

      if (payload.type === 'notification:read' && payload.notificationId) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === payload.notificationId ? { ...n, readAt: new Date().toISOString() } : n
          )
        )

        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    })

    subscription
      .create()
      .then(() => {
        setIsConnected(true)
      })
      .catch((error) => {
        console.error('Failed to connect to notifications stream:', error)
        setIsConnected(false)
      })

    return () => {
      stopListening()
      subscription.delete().catch(() => {})
      setIsConnected(false)
    }
  }, [auth.user])

  return {
    notifications,
    unreadCount,
    isConnected,
    setNotifications,
    setUnreadCount,
  }
}
