import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Disc, Mail, Server } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { HealthStatusBadge } from './health-status-badge'
import type { MonitoringData } from './types'

interface Props {
  health: MonitoringData['health']
}

/**
 * Top row of four service-health cards (database / redis / disk /
 * email queue). Each card is mostly identical so the inner shape is
 * shared in HealthCard below — only the icon, label and content
 * differ.
 */
export function MonitoringHealthCards({ health }: Props) {
  const { t } = useI18n()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <HealthCard
        icon={<Database className="w-4 h-4 mr-2" />}
        title={t('admin.monitoring.card_database')}
        status={health.database.status}
      >
        {health.database.latency && (
          <div className="text-2xl font-bold">{health.database.latency}ms</div>
        )}
        {health.database.details?.connection && (
          <div className="text-sm text-muted-foreground">
            {t('admin.monitoring.pool_label', {
              used: health.database.details.connection.used,
              max: health.database.details.connection.max,
            })}
          </div>
        )}
      </HealthCard>

      <HealthCard
        icon={<Server className="w-4 h-4 mr-2" />}
        title={t('admin.monitoring.card_redis')}
        status={health.redis.status}
      >
        {health.redis.latency && <div className="text-2xl font-bold">{health.redis.latency}ms</div>}
        {health.redis.details?.memory && (
          <div className="text-sm text-muted-foreground">
            {t('admin.monitoring.memory_label', { value: health.redis.details.memory.used })}
          </div>
        )}
      </HealthCard>

      <HealthCard
        icon={<Disc className="w-4 h-4 mr-2" />}
        title={t('admin.monitoring.card_disk')}
        status={health.disk.status}
      >
        {health.disk.details && (
          <>
            <div className="text-2xl font-bold">{health.disk.details.freePercentage}%</div>
            <div className="text-sm text-muted-foreground">
              {t('admin.monitoring.free_suffix', { value: health.disk.details.free })}
            </div>
          </>
        )}
      </HealthCard>

      <HealthCard
        icon={<Mail className="w-4 h-4 mr-2" />}
        title={t('admin.monitoring.card_email')}
        status={health.email.status}
      >
        {health.email.details && (
          <>
            <div className="text-2xl font-bold">{health.email.details.waiting}</div>
            <div className="text-sm text-muted-foreground">
              {t('admin.monitoring.pending_failed', { failed: health.email.details.failed })}
            </div>
          </>
        )}
      </HealthCard>
    </div>
  )
}

function HealthCard({
  icon,
  title,
  status,
  children,
}: {
  icon: React.ReactNode
  title: string
  status: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center">
          {icon}
          {title}
          <HealthStatusBadge status={status} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">{children}</div>
      </CardContent>
    </Card>
  )
}
