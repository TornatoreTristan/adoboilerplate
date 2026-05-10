import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { Mail } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
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

export default function MailsPage({ logs, stats, filters }: Props) {
  const { t } = useI18n()
  const [statusFilter, setStatusFilter] = useState(filters.status || 'all')
  const [categoryFilter, setCategoryFilter] = useState(filters.category || 'all')
  const [searchQuery, setSearchQuery] = useState(filters.search || '')

  const description =
    stats.total > 1
      ? t('admin.mails.count_plural', { count: stats.total })
      : t('admin.mails.count_singular', { count: stats.total })

  const navigate = (params: URLSearchParams) => {
    router.get(`/admin/mails?${params.toString()}`, {}, { preserveState: true })
  }

  const handleFilterChange = (next: { status: string; category: string; search: string }) => {
    setStatusFilter(next.status)
    setCategoryFilter(next.category)
    setSearchQuery(next.search)

    const params = new URLSearchParams()
    if (next.status !== 'all') params.set('status', next.status)
    if (next.category !== 'all') params.set('category', next.category)
    if (next.search) params.set('search', next.search)
    navigate(params)
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (categoryFilter !== 'all') params.set('category', categoryFilter)
    if (searchQuery) params.set('search', searchQuery)
    navigate(params)
  }

  return (
    <>
      <Head title={t('admin.mails.head_title')} />
      <AdminLayout breadcrumbs={[{ label: t('admin.emails') }]}>
        <div className="flex flex-col gap-6 p-6">
          <PageHeader title={t('admin.mails.title')} description={description} icon={Mail} />

          <MailsStatsRow stats={stats} />

          <MailsFiltersBar
            status={statusFilter}
            category={categoryFilter}
            search={searchQuery}
            categories={stats.byCategory}
            onChange={handleFilterChange}
          />

          <MailsTable logs={logs} onPageChange={handlePageChange} />
        </div>
      </AdminLayout>
    </>
  )
}
