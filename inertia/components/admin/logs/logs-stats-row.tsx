import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/hooks/use-i18n'
import type { LogStats } from './types'

interface Props {
  stats: LogStats
}

export function LogsStatsRow({ stats }: Props) {
  const { t } = useI18n()
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Stat title={t('admin.logs.stats.total_logs')} value={stats.total.toLocaleString()} />
      <Stat title={t('admin.logs.stats.last_24h')} value={stats.last24h.toLocaleString()} />
      <Stat
        title={t('admin.logs.stats.errors')}
        value={(stats.byLevel.error || 0) + (stats.byLevel.fatal || 0)}
        valueClassName="text-red-600"
      />
      <Stat
        title={t('admin.logs.stats.warnings')}
        value={stats.byLevel.warn || 0}
        valueClassName="text-yellow-600"
      />
    </div>
  )
}

function Stat({
  title,
  value,
  valueClassName,
}: {
  title: string
  value: string | number
  valueClassName?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName ?? ''}`}>{value}</div>
      </CardContent>
    </Card>
  )
}
