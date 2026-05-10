import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useI18n } from '@/hooks/use-i18n'
import type { Session } from './types'

interface Props {
  sessions: Session[]
}

export function UserStatsCard({ sessions }: Props) {
  const { t, locale } = useI18n()
  const distanceLocale = locale === 'en' ? enUS : fr

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.user_detail.statistics_title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Row
          label={t('admin.user_detail.stats_total_sessions')}
          value={<span className="font-semibold">{sessions.length}</span>}
        />
        <Row
          label={t('admin.user_detail.stats_active_sessions')}
          value={<span className="font-semibold">{sessions.filter((s) => s.isActive).length}</span>}
        />
        {sessions.length > 0 && (
          <Row
            label={t('admin.user_detail.stats_last_activity')}
            value={
              <span className="text-sm">
                {t('admin.user_detail.stats_time_ago', {
                  time: formatDistanceToNow(new Date(sessions[0].lastActivity), {
                    locale: distanceLocale,
                  }),
                })}
              </span>
            }
          />
        )}
      </CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      {value}
    </div>
  )
}
