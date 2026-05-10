import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head, router } from '@inertiajs/react'
import { Layers, Eye, Pause, Play } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { useFormatNumber } from '@/hooks/use-format-number'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface QueueStats {
  active: number
  waiting: number
  completed: number
  failed: number
  delayed: number
  paused: number
}

interface Queue {
  name: string
  isDeadLetter: boolean
  isPaused: boolean
  stats: QueueStats
}

interface Props {
  queues: Queue[]
}

function StatBadge({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  const formatNumber = useFormatNumber()
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {highlight && value > 0 ? (
        <Badge variant="destructive" className="text-sm font-bold">
          {formatNumber(value)}
        </Badge>
      ) : (
        <span className="text-sm font-semibold">{formatNumber(value)}</span>
      )}
    </div>
  )
}

function QueueCard({ queue }: { queue: Queue }) {
  const { t } = useI18n()

  const handlePause = () => {
    router.post(`/admin/queues/${encodeURIComponent(queue.name)}/pause`)
  }

  const handleResume = () => {
    router.post(`/admin/queues/${encodeURIComponent(queue.name)}/resume`)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold truncate">{queue.name}</CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={queue.isPaused ? 'secondary' : 'default'}>
              {queue.isPaused ? t('admin.queues.status.paused') : t('admin.queues.status.running')}
            </Badge>
            {queue.isDeadLetter && (
              <Badge variant="outline" className="text-xs">
                DLQ
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <StatBadge label={t('admin.queues.stats.active')} value={queue.stats.active} />
          <StatBadge label={t('admin.queues.stats.waiting')} value={queue.stats.waiting} />
          <StatBadge label={t('admin.queues.stats.completed')} value={queue.stats.completed} />
          <StatBadge label={t('admin.queues.stats.failed')} value={queue.stats.failed} highlight />
          <StatBadge label={t('admin.queues.stats.delayed')} value={queue.stats.delayed} />
          <StatBadge label={t('admin.queues.stats.paused')} value={queue.stats.paused} />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" asChild>
            <a href={`/admin/queues/${encodeURIComponent(queue.name)}`}>
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              {t('admin.queues.actions.view_details')}
            </a>
          </Button>
          {queue.isPaused ? (
            <Button variant="outline" size="sm" onClick={handleResume}>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              {t('admin.queues.actions.resume')}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handlePause}>
              <Pause className="h-3.5 w-3.5 mr-1.5" />
              {t('admin.queues.actions.pause')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function QueuesIndexPage({ queues }: Props) {
  const { t } = useI18n()

  return (
    <>
      <Head title={t('admin.queues.head_title')} />
      <AdminLayout breadcrumbs={[{ label: t('admin.queues.title') }]}>
        <div className="flex flex-col gap-6 p-6">
          <PageHeader
            title={t('admin.queues.title')}
            description={t('admin.queues.description')}
            icon={Layers}
          />
          {queues.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('admin.queues.failed_jobs.empty')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {queues.map((queue) => (
                <QueueCard key={queue.name} queue={queue} />
              ))}
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  )
}
