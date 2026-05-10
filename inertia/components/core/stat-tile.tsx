import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type LucideIcon } from 'lucide-react'

interface Props {
  title: string
  value: React.ReactNode
  subtitle?: React.ReactNode
  icon?: LucideIcon
  iconClassName?: string
  valueClassName?: string
}

/**
 * Stat tile used in admin dashboards (logs, mails, monitoring, subscriptions,
 * plans). Header shows a title + optional icon, body shows a big value and
 * an optional muted subtitle.
 */
export function StatTile({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName,
  valueClassName,
}: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${iconClassName ?? 'text-muted-foreground'}`} />}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName ?? ''}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
