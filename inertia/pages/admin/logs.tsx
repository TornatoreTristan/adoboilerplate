import { useState } from 'react'
import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/use-i18n'
import { useLogs } from '@/components/admin/logs/use-logs'
import { LogsStatsRow } from '@/components/admin/logs/logs-stats-row'
import { LogsFiltersCard } from '@/components/admin/logs/logs-filters-card'
import { LogsTable } from '@/components/admin/logs/logs-table'
import { LogDetailDialog } from '@/components/admin/logs/log-detail-dialog'
import type { Log, LogFilters } from '@/components/admin/logs/types'

export default function Logs() {
  const { t } = useI18n()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<LogFilters>({
    level: 'all',
    search: '',
    method: 'all',
  })
  const [selectedLog, setSelectedLog] = useState<Log | null>(null)

  const { logs, stats, total, loading, perPage, refresh } = useLogs(filters, page)

  const updateFilters = (next: LogFilters) => {
    setPage(1)
    setFilters(next)
  }

  return (
    <>
      <Head title={t('admin.logs.head_title')} />
      <AdminLayout breadcrumbs={[{ label: t('admin.logs.title') }]}>
        <div className="flex flex-col gap-6 p-6">
          <PageHeader title={t('admin.logs.title')} description={t('admin.logs.description')} />

          {stats && <LogsStatsRow stats={stats} />}

          <LogsFiltersCard filters={filters} onChange={updateFilters} onRefresh={refresh} />

          <LogsTable logs={logs} loading={loading} onSelect={setSelectedLog} />

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t('admin.logs.showing_range', {
                from: Math.min((page - 1) * perPage + 1, total),
                to: Math.min(page * perPage, total),
                total,
              })}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t('admin.logs.previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * perPage >= total}
              >
                {t('admin.logs.next')}
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>

      <LogDetailDialog log={selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)} />
    </>
  )
}
