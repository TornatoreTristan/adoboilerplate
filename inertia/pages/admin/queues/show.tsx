import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head, router } from '@inertiajs/react'
import { Layers, Pause, Play, RotateCcw, Trash2 } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { useFormatNumber } from '@/hooks/use-format-number'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

interface FailedJob {
  id: string
  name: string
  data: unknown
  failedReason: string
  attemptsMade: number
  maxAttempts: number
  timestampIso: string
  processedOnIso: string | null
  finishedOnIso: string | null
  stacktrace: string[]
}

interface Props {
  queue: Queue
  failedJobs: FailedJob[]
}

function StatCard({
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
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {highlight && value > 0 ? (
          <Badge variant="destructive" className="text-lg font-bold px-2 py-0.5">
            {formatNumber(value)}
          </Badge>
        ) : (
          <p className="text-2xl font-bold">{formatNumber(value)}</p>
        )}
      </CardContent>
    </Card>
  )
}

function FailedJobRow({ job, queueName }: { job: FailedJob; queueName: string }) {
  const { t } = useI18n()

  const handleRetry = () => {
    router.post(`/admin/queues/${encodeURIComponent(queueName)}/jobs/${job.id}/retry`)
  }

  const handleRemove = () => {
    router.post(`/admin/queues/${encodeURIComponent(queueName)}/jobs/${job.id}/remove`)
  }

  const failedAt = job.finishedOnIso
    ? new Date(job.finishedOnIso).toLocaleString()
    : new Date(job.timestampIso).toLocaleString()

  const truncatedError =
    job.failedReason.length > 80 ? `${job.failedReason.slice(0, 80)}…` : job.failedReason

  return (
    <TableRow>
      <TableCell className="font-mono text-xs text-muted-foreground">{job.id}</TableCell>
      <TableCell className="font-medium">{job.name}</TableCell>
      <TableCell className="text-center">
        {job.attemptsMade}/{job.maxAttempts}
      </TableCell>
      <TableCell className="max-w-xs">
        <span className="text-destructive text-xs" title={job.failedReason}>
          {truncatedError}
        </span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{failedAt}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            title={t('admin.queues.actions.retry')}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" title={t('admin.queues.actions.remove')}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('admin.queues.actions.remove')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('admin.queues.actions.confirm_remove')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemove}>
                  {t('admin.queues.actions.remove')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function QueueShowPage({ queue, failedJobs }: Props) {
  const { t } = useI18n()

  const handlePause = () => {
    router.post(`/admin/queues/${encodeURIComponent(queue.name)}/pause`)
  }

  const handleResume = () => {
    router.post(`/admin/queues/${encodeURIComponent(queue.name)}/resume`)
  }

  return (
    <>
      <Head title={t('admin.queues.head_title')} />
      <AdminLayout
        breadcrumbs={[
          { label: t('admin.queues.title'), href: '/admin/queues' },
          { label: queue.name },
        ]}
      >
        <div className="flex flex-col gap-6 p-6">
          <PageHeader
            title={queue.name}
            description={t('admin.queues.description')}
            icon={Layers}
            actions={
              <div className="flex items-center gap-2">
                <Badge variant={queue.isPaused ? 'secondary' : 'default'}>
                  {queue.isPaused
                    ? t('admin.queues.status.paused')
                    : t('admin.queues.status.running')}
                </Badge>
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
            }
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label={t('admin.queues.stats.active')} value={queue.stats.active} />
            <StatCard label={t('admin.queues.stats.waiting')} value={queue.stats.waiting} />
            <StatCard label={t('admin.queues.stats.completed')} value={queue.stats.completed} />
            <StatCard label={t('admin.queues.stats.failed')} value={queue.stats.failed} highlight />
            <StatCard label={t('admin.queues.stats.delayed')} value={queue.stats.delayed} />
            <StatCard label={t('admin.queues.stats.paused')} value={queue.stats.paused} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('admin.queues.failed_jobs.title', { count: failedJobs.length })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {failedJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t('admin.queues.failed_jobs.empty')}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">
                          {t('admin.queues.failed_jobs.column_id')}
                        </TableHead>
                        <TableHead>{t('admin.queues.failed_jobs.column_name')}</TableHead>
                        <TableHead className="text-center w-24">
                          {t('admin.queues.failed_jobs.column_attempts')}
                        </TableHead>
                        <TableHead>{t('admin.queues.failed_jobs.column_error')}</TableHead>
                        <TableHead className="w-40">
                          {t('admin.queues.failed_jobs.column_date')}
                        </TableHead>
                        <TableHead className="w-24">
                          {t('admin.queues.failed_jobs.column_actions')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failedJobs.map((job) => (
                        <FailedJobRow key={job.id} job={job} queueName={queue.name} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </>
  )
}
