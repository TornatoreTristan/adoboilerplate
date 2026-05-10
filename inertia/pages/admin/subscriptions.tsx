import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head } from '@inertiajs/react'
import { Receipt } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { useInertiaTableQuery } from '@/hooks/use-inertia-table-query'
import { SubscriptionsStatsRow } from '@/components/admin/subscriptions/subscriptions-stats-row'
import { SubscriptionsFiltersCard } from '@/components/admin/subscriptions/subscriptions-filters-card'
import { SubscriptionsTable } from '@/components/admin/subscriptions/subscriptions-table'
import type {
  Filters,
  Plan,
  Stats,
  Subscription,
} from '@/components/admin/subscriptions/types'

interface Props {
  subscriptions: Subscription[]
  stats: Stats
  plans: Plan[]
  filters: Filters
}

export default function SubscriptionsPage({ subscriptions, stats, plans, filters: initialFilters }: Props) {
  const { t } = useI18n()

  const { filters, setFilter, setSearch } = useInertiaTableQuery<Required<Filters>>({
    url: '/admin/subscriptions',
    initial: {
      status: initialFilters.status ?? '',
      planId: initialFilters.planId ?? '',
      search: initialFilters.search ?? '',
    },
    only: ['subscriptions', 'stats', 'filters'],
  })

  return (
    <>
      <Head title={t('admin.subscriptions.head_title')} />
      <AdminLayout breadcrumbs={[{ label: t('admin.subscriptions.title') }]}>
        <div className="flex flex-col gap-6 p-6">
          <PageHeader
            title={t('admin.subscriptions.title')}
            description={t('admin.subscriptions.description', { total: stats.total })}
            icon={Receipt}
          />
          <SubscriptionsStatsRow stats={stats} />
          <SubscriptionsFiltersCard
            filters={filters}
            plans={plans}
            onStatusChange={(value) => setFilter('status', value === 'all' ? '' : value)}
            onPlanChange={(value) => setFilter('planId', value === 'all' ? '' : value)}
            onSearchChange={(value) => setSearch('search', value)}
          />
          <SubscriptionsTable subscriptions={subscriptions} />
        </div>
      </AdminLayout>
    </>
  )
}
