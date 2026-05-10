import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Clock,
  Eye,
  MousePointerClick,
  Send,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import type { EmailStatus } from './types'

const STATUS_VARIANTS: Record<
  EmailStatus,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: LucideIcon }
> = {
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
  const Icon = config.icon
  return (
    <Badge variant={config.variant} className="flex items-center gap-1.5 w-fit">
      <Icon className="h-3 w-3" />
      {t(`admin.mails.status.${status}`)}
    </Badge>
  )
}
