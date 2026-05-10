import { type LucideIcon } from 'lucide-react'

interface Props {
  message: string
  icon?: LucideIcon
  title?: string
  action?: React.ReactNode
  className?: string
}

/**
 * Replaces the `<p className="text-sm text-muted-foreground text-center
 * py-4|py-8">…</p>` blocks scattered across cards. Pass `icon` + `title`
 * for a richer empty state, or just `message` for the minimal one.
 */
export function EmptyState({ message, icon: Icon, title, action, className }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-8 ${className ?? ''}`}
    >
      {Icon && <Icon className="h-8 w-8 text-muted-foreground mb-2" />}
      {title && <p className="font-medium mb-1">{title}</p>}
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
