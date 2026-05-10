import { Badge } from '@/components/ui/badge'
import { type LucideIcon } from 'lucide-react'

export type StatusBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

interface Props {
  label: string
  variant?: StatusBadgeVariant
  icon?: LucideIcon
  className?: string
}

/**
 * Generic status badge with optional icon. Feature-specific badges (log
 * level, email status, role, subscription status…) are thin wrappers that
 * pick the variant + icon from a config map and forward the rest here.
 */
export function StatusBadge({ label, variant = 'default', icon: Icon, className }: Props) {
  return (
    <Badge variant={variant} className={`flex items-center gap-1.5 w-fit ${className ?? ''}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </Badge>
  )
}
