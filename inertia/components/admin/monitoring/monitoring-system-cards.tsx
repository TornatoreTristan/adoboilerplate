import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, MemoryStick } from 'lucide-react'
import { KeyValueRow } from '@/components/core/key-value-row'
import { useI18n } from '@/hooks/use-i18n'
import { useFormatNumber } from '@/hooks/use-format-number'
import type { MonitoringData } from './types'

interface Props {
  metrics: MonitoringData['metrics']
}

export function MonitoringSystemCards({ metrics }: Props) {
  const { t } = useI18n()
  const formatNumber = useFormatNumber()

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            {t('admin.monitoring.card_performance')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <KeyValueRow
            label={t('admin.monitoring.metric_cpu')}
            value={`${metrics.process.cpuUsagePercent}%`}
            valueClassName="font-medium"
          />
          <div>
            <KeyValueRow
              label={t('admin.monitoring.metric_memory')}
              value={`${metrics.process.memoryUsage.percentage}%`}
              valueClassName="font-medium"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {metrics.process.memoryUsage.rss}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center">
            <MemoryStick className="w-4 h-4 mr-2" />
            {t('admin.monitoring.card_system')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <KeyValueRow
            label={t('admin.monitoring.metric_cpus')}
            value={metrics.system.cpuCount}
            valueClassName="font-medium"
          />
          <KeyValueRow
            label={t('admin.monitoring.metric_total_memory')}
            value={metrics.system.totalMemory}
            valueClassName="font-medium"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('admin.monitoring.card_cache')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <KeyValueRow
            label={t('admin.monitoring.metric_hit_rate')}
            value={`${metrics.cache.hitRate}%`}
            valueClassName="font-medium"
          />
          <KeyValueRow
            label={t('admin.monitoring.metric_keys')}
            value={formatNumber(metrics.cache.keyCount)}
            valueClassName="font-medium"
          />
        </CardContent>
      </Card>
    </div>
  )
}
