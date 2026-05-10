import { Bell } from 'lucide-react'
import { Link } from '@adonisjs/inertia/react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/hooks/use-notifications'

interface NotificationBellProps {
  className?: string
  showLabel?: boolean
  label?: string
}

export function NotificationBell({ className, showLabel = false, label }: NotificationBellProps) {
  const { unreadCount } = useNotifications()

  return (
    <Link
      href="/notifications"
      className={cn(
        'relative flex items-center gap-2 hover:opacity-80 transition-opacity',
        className
      )}
    >
      <div className="relative">
        <Bell className="h-4 w-4" />

        {/* Badge avec compteur */}
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-4 min-w-4 flex items-center justify-center p-0 px-1 text-[9px]"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </div>

      {/* Label optionnel */}
      {showLabel && label && <span>{label}</span>}
    </Link>
  )
}
