import { StatTile } from '@/components/core/stat-tile'
import { useI18n } from '@/hooks/use-i18n'
import type { LogStats } from './types'

interface Props {
  stats: LogStats
}

export function LogsStatsRow({ stats }: Props) {
  const { t } = useI18n()
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatTile title={t('admin.logs.stats.total_logs')} value={stats.total.toLocaleString()} />
      <StatTile title={t('admin.logs.stats.last_24h')} value={stats.last24h.toLocaleString()} />
      <StatTile
        title={t('admin.logs.stats.errors')}
        value={(stats.byLevel.error || 0) + (stats.byLevel.fatal || 0)}
        valueClassName="text-red-600"
      />
      <StatTile
        title={t('admin.logs.stats.warnings')}
        value={stats.byLevel.warn || 0}
        valueClassName="text-yellow-600"
      />
    </div>
  )
}
