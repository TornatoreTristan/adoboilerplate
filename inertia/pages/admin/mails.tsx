import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head } from '@inertiajs/react'
import { Mail } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { useInertiaTableQuery } from '@/hooks/use-inertia-table-query'
import { MailsStatsRow } from '@/components/admin/mails/mails-stats-row'
import { MailsFiltersBar } from '@/components/admin/mails/mails-filters-bar'
import { MailsTable } from '@/components/admin/mails/mails-table'
import type {
  EmailLogsStats,
  MailsFilters,
  MailsLogsPayload,
} from '@/components/admin/mails/types'

interface Props {
  logs: MailsLogsPayload
  stats: EmailLogsStats
  filters: MailsFilters
}

export default function MailsPage({ logs, stats, filters: initialFilters }: Props) {
  const { t } = useI18n()

  const { filters, page, setFilter, setSearch, setPage } = useInertiaTableQuery<
    Required<MailsFilters>
  >({
    url: '/admin/mails',
    initial: {
      status: initialFilters.status ?? '',
      category: initialFilters.category ?? '',
      search: initialFilters.search ?? '',
    },
    initialPage: logs.meta.currentPage,
    only: ['logs', 'stats', 'filters'],
  })

  const description =
    stats.total > 1
      ? t('admin.mails.count_plural', { count: stats.total })
      : t('admin.mails.count_singular', { count: stats.total })

  return (
    <>
      <Head title={t('admin.mails.head_title')} />
      <AdminLayout breadcrumbs={[{ label: t('admin.emails') }]}>
        <div className="flex flex-col gap-6 p-6">
          <PageHeader title={t('admin.mails.title')} description={description} icon={Mail} />

          <MailsStatsRow stats={stats} />

          <MailsFiltersBar
            status={filters.status || 'all'}
            category={filters.category || 'all'}
            search={filters.search}
            categories={stats.byCategory}
            onStatusChange={(value) => setFilter('status', value === 'all' ? '' : value)}
            onCategoryChange={(value) => setFilter('category', value === 'all' ? '' : value)}
            onSearchChange={(value) => setSearch('search', value)}
          />

          <MailsTable logs={logs} onPageChange={setPage} />
        </div>
      </AdminLayout>
    </>
  )
}
