import {
  CheckCircle2,
  Clock,
  Eye,
  MousePointerClick,
  Send,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { StatusBadge, type StatusBadgeVariant } from '@/components/core/status-badge'
import { useI18n } from '@/hooks/use-i18n'
import type { EmailStatus } from './types'

const STATUS_VARIANTS: Record<EmailStatus, { variant: StatusBadgeVariant; icon: LucideIcon }> = {
  sent: { variant: 'default', icon: Send },
  delivered: { variant: 'default', icon: CheckCircle2 },
  opened: { variant: 'secondary', icon: Eye },
  clicked: { variant: 'secondary', icon: MousePointerClick },
  failed: { variant: 'destructive', icon: XCircle },
  bounced: { variant: 'destructive', icon: XCircle },
  complained: { variant: 'destructive', icon: XCircle },
  pending: { variant: 'outline', icon: Clock },
  received: { variant: 'outline', icon: Clock },
  delivery_delayed: { variant: 'outline', icon: Clock },
}

export function EmailStatusBadge({ status }: { status: EmailStatus }) {
  const { t } = useI18n()
  const config = STATUS_VARIANTS[status]
  return (
    <StatusBadge
      label={t(`admin.mails.status.${status}`)}
      variant={config.variant}
      icon={config.icon}
    />
  )
}
