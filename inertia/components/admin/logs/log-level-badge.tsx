import { AlertCircle, AlertTriangle, Info, Skull, XCircle, type LucideIcon } from 'lucide-react'
import { StatusBadge, type StatusBadgeVariant } from '@/components/core/status-badge'

const ICONS: Record<string, LucideIcon> = {
  debug: Info,
  info: Info,
  warn: AlertTriangle,
  error: XCircle,
  fatal: Skull,
}

const VARIANTS: Record<string, StatusBadgeVariant> = {
  debug: 'outline',
  info: 'default',
  warn: 'secondary',
  error: 'destructive',
  fatal: 'destructive',
}

export function LogLevelBadge({ level }: { level: string }) {
  return (
    <StatusBadge
      label={level.toUpperCase()}
      variant={VARIANTS[level] || 'default'}
      icon={ICONS[level] || AlertCircle}
    />
  )
}

export function StatusCodeBadge({ code }: { code: number | null }) {
  if (!code) return null
  let variant: StatusBadgeVariant = 'default'
  if (code >= 500) variant = 'destructive'
  else if (code >= 400) variant = 'secondary'
  return <StatusBadge label={String(code)} variant={variant} />
}
