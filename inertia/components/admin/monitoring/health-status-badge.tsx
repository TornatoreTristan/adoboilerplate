import { Badge } from '@/components/ui/badge'
import type { HealthStatus } from './types'

interface Props {
  status: HealthStatus | string
}

/**
 * Tiny shared atom — the same status badge appears next to every
 * health card title, so it lives in its own file to keep the variant
 * mapping in one place.
 */
export function HealthStatusBadge({ status }: Props) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
    ok: 'default',
    degraded: 'secondary',
    down: 'destructive',
  }
  return (
    <Badge variant={variants[status] || 'default'} className="ml-2">
      {status.toUpperCase()}
    </Badge>
  )
}
