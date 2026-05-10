import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Clock, Mail, Send, XCircle, type LucideIcon } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import type { EmailLogsStats } from './types'

interface Props {
  stats: EmailLogsStats
}

export function MailsStatsRow({ stats }: Props) {
  const { t } = useI18n()
  const successRate = stats.total > 0 ? ((stats.sent + stats.delivered) / stats.total) * 100 : 0
  const failedRate = stats.total > 0 ? (stats.failed / stats.total) * 100 : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Stat
        title={t('admin.mails.stats.total_title')}
        value={stats.total}
        subtitle={t('admin.mails.stats.total_subtitle')}
        icon={Mail}
        iconClassName="text-muted-foreground"
      />
      <Stat
        title={t('admin.mails.stats.sent_title')}
        value={stats.sent + stats.delivered}
        subtitle={t('admin.mails.stats.sent_subtitle', { rate: successRate.toFixed(1) })}
        icon={Send}
        iconClassName="text-green-600"
      />
      <Stat
        title={t('admin.mails.stats.failed_title')}
        value={stats.failed}
        subtitle={t('admin.mails.stats.failed_subtitle', { rate: failedRate.toFixed(1) })}
        icon={XCircle}
        iconClassName="text-red-600"
      />
      <Stat
        title={t('admin.mails.stats.delivered_title')}
        value={stats.delivered}
        subtitle={t('admin.mails.stats.delivered_subtitle')}
        icon={CheckCircle2}
        iconClassName="text-green-600"
      />
      <Stat
        title={t('admin.mails.stats.pending_title')}
        value={stats.pending}
        subtitle={t('admin.mails.stats.pending_subtitle')}
        icon={Clock}
        iconClassName="text-orange-600"
      />
    </div>
  )
}

interface StatProps {
  title: string
  value: number
  subtitle: string
  icon: LucideIcon
  iconClassName?: string
}

function Stat({ title, value, subtitle, icon: Icon, iconClassName }: StatProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconClassName ?? ''}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}
