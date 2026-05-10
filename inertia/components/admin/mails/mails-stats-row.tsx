import { CheckCircle2, Clock, Mail, Send, XCircle } from 'lucide-react'
import { StatTile } from '@/components/core/stat-tile'
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
      <StatTile
        title={t('admin.mails.stats.total_title')}
        value={stats.total}
        subtitle={t('admin.mails.stats.total_subtitle')}
        icon={Mail}
      />
      <StatTile
        title={t('admin.mails.stats.sent_title')}
        value={stats.sent + stats.delivered}
        subtitle={t('admin.mails.stats.sent_subtitle', { rate: successRate.toFixed(1) })}
        icon={Send}
        iconClassName="text-green-600"
      />
      <StatTile
        title={t('admin.mails.stats.failed_title')}
        value={stats.failed}
        subtitle={t('admin.mails.stats.failed_subtitle', { rate: failedRate.toFixed(1) })}
        icon={XCircle}
        iconClassName="text-red-600"
      />
      <StatTile
        title={t('admin.mails.stats.delivered_title')}
        value={stats.delivered}
        subtitle={t('admin.mails.stats.delivered_subtitle')}
        icon={CheckCircle2}
        iconClassName="text-green-600"
      />
      <StatTile
        title={t('admin.mails.stats.pending_title')}
        value={stats.pending}
        subtitle={t('admin.mails.stats.pending_subtitle')}
        icon={Clock}
        iconClassName="text-orange-600"
      />
    </div>
  )
}
