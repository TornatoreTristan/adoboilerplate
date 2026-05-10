import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, MemoryStick } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import type { MonitoringData } from './types'

interface Props {
  metrics: MonitoringData['metrics']
}

/**
 * Second row of cards: per-process performance, host info, cache
 * effectiveness. These use the same data source as the chart panels
 * below but expose the *current* values rather than the time series.
 */
export function MonitoringSystemCards({ metrics }: Props) {
  const { t } = useI18n()

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
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('admin.monitoring.metric_cpu')}</span>
            <span className="font-medium">{metrics.process.cpuUsagePercent}%</span>
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('admin.monitoring.metric_memory')}</span>
              <span className="font-medium">{metrics.process.memoryUsage.percentage}%</span>
            </div>
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
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('admin.monitoring.metric_cpus')}</span>
            <span className="font-medium">{metrics.system.cpuCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('admin.monitoring.metric_total_memory')}
            </span>
            <span className="font-medium">{metrics.system.totalMemory}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('admin.monitoring.card_cache')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('admin.monitoring.metric_hit_rate')}</span>
            <span className="font-medium">{metrics.cache.hitRate}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('admin.monitoring.metric_keys')}</span>
            <span className="font-medium">{metrics.cache.keyCount.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
