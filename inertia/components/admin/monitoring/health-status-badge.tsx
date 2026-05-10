import { StatusBadge, type StatusBadgeVariant } from '@/components/core/status-badge'
import type { HealthStatus } from './types'

const VARIANTS: Record<string, StatusBadgeVariant> = {
  ok: 'default',
  degraded: 'secondary',
  down: 'destructive',
}

export function HealthStatusBadge({ status }: { status: HealthStatus | string }) {
  return (
    <StatusBadge
      label={status.toUpperCase()}
      variant={VARIANTS[status] || 'default'}
      className="ml-2"
    />
  )
}
