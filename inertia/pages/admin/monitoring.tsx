import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head } from '@inertiajs/react'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { useMonitoringData } from '@/components/admin/monitoring/use-monitoring-data'
import { MonitoringHealthCards } from '@/components/admin/monitoring/monitoring-health-cards'
import { MonitoringSystemCards } from '@/components/admin/monitoring/monitoring-system-cards'
import { MonitoringCharts } from '@/components/admin/monitoring/monitoring-charts'

const formatUptime = (seconds: number, t: (k: string, p?: Record<string, unknown>) => string) => {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return t('admin.monitoring.uptime_format', { days, hours, minutes })
}

export default function Monitoring() {
  const { t } = useI18n()
  // The page is currently always-on auto-refresh; the hook supports
  // toggling but no UI exposes it yet.
  const { data, history, loading, lastUpdate, refresh } = useMonitoringData(true)

  if (loading) {
    return (
      <>
        <Head title={t('admin.monitoring.head_title')} />
        <AdminLayout breadcrumbs={[{ label: t('admin.monitoring.title') }]}>
          <div className="flex flex-col gap-6 p-6">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        </AdminLayout>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <Head title={t('admin.monitoring.head_title')} />
        <AdminLayout breadcrumbs={[{ label: t('admin.monitoring.title') }]}>
          <div className="flex flex-col gap-6 p-6">
            <Alert variant="destructive">
              <AlertDescription>{t('admin.monitoring.load_failed')}</AlertDescription>
            </Alert>
          </div>
        </AdminLayout>
      </>
    )
  }

  return (
    <>
      <Head title={t('admin.monitoring.head_title')} />
      <AdminLayout breadcrumbs={[{ label: t('admin.monitoring.title') }]}>
        <div className="flex flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <PageHeader
              title={t('admin.monitoring.title')}
              description={t('admin.monitoring.description', {
                uptime: formatUptime(data.uptime, t),
                status: data.status.toUpperCase(),
                seconds: Math.floor((Date.now() - lastUpdate.getTime()) / 1000),
              })}
            />
            <Button onClick={refresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('admin.monitoring.refresh')}
            </Button>
          </div>

          <MonitoringHealthCards health={data.health} />
          <MonitoringSystemCards metrics={data.metrics} />
          {history.length > 0 && <MonitoringCharts history={history} />}
        </div>
      </AdminLayout>
    </>
  )
}
