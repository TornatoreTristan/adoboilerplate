import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KeyValueRow } from '@/components/core/key-value-row'
import { useRelativeDate } from '@/hooks/use-relative-date'
import { useI18n } from '@/hooks/use-i18n'
import type { Session } from './types'

interface Props {
  sessions: Session[]
}

export function UserStatsCard({ sessions }: Props) {
  const { t } = useI18n()
  const formatRelative = useRelativeDate()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.user_detail.statistics_title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <KeyValueRow
          label={t('admin.user_detail.stats_total_sessions')}
          value={sessions.length}
          valueClassName="font-semibold"
        />
        <KeyValueRow
          label={t('admin.user_detail.stats_active_sessions')}
          value={sessions.filter((s) => s.isActive).length}
          valueClassName="font-semibold"
        />
        {sessions.length > 0 && (
          <KeyValueRow
            label={t('admin.user_detail.stats_last_activity')}
            value={t('admin.user_detail.stats_time_ago', {
              time: formatRelative(sessions[0].lastActivity, { addSuffix: false }),
            })}
          />
        )}
      </CardContent>
    </Card>
  )
}
