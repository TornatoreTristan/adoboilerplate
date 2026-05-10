import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head, router } from '@inertiajs/react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Eye,
  MousePointerClick,
  Paperclip,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/hooks/use-i18n'

interface EmailLog {
  id: string
  userId: string | null
  recipient: string
  subject: string
  category: string
  status:
    | 'pending'
    | 'sent'
    | 'delivered'
    | 'delivery_delayed'
    | 'bounced'
    | 'complained'
    | 'opened'
    | 'clicked'
    | 'failed'
    | 'received'
  providerId: string | null
  errorMessage: string | null
  opensCount: number
  clicksCount: number
  openedAt: string | null
  clickedAt: string | null
  sentAt: string | null
  deliveredAt: string | null
  failedAt: string | null
  createdAt: string
  hasAttachments: boolean
}

interface EmailLogsStats {
  total: number
  sent: number
  failed: number
  delivered: number
  pending: number
  byCategory: { category: string; count: number }[]
}

interface MailsPageProps {
  logs: {
    data: EmailLog[]
    meta: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
  }
  stats: EmailLogsStats
  filters: {
    status?: string
    category?: string
    search?: string
  }
}

const STATUS_VARIANTS: Record<
  EmailLog['status'],
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }
> = {
  sent: { variant: 'default', icon: Send },
  delivered: { variant: 'default', icon: CheckCircle2 },
  opened: { variant: 'secondary', icon: Eye },
  clicked: { variant: 'secondary', icon: MousePointerClick },
  failed: { variant: 'destructive', icon: XCircle },
  bounced: { variant: 'destructive', icon: XCircle },
  complained: { variant: 'destructive', icon: XCircle },
  pending: { variant: 'outline', icon: Clock },
  received: { variant: 'outline', icon: Clock },
  delivery_delayed: { variant: 'outline', icon: Clock },
}

const MailsPage = ({ logs, stats, filters }: MailsPageProps) => {
  const { t } = useI18n()
  const [statusFilter, setStatusFilter] = useState(filters.status || 'all')
  const [categoryFilter, setCategoryFilter] = useState(filters.category || 'all')
  const [searchQuery, setSearchQuery] = useState(filters.search || '')

  const handleFilterChange = (status: string, category: string, search: string) => {
    const params = new URLSearchParams()
    if (status && status !== 'all') params.set('status', status)
    if (category && category !== 'all') params.set('category', category)
    if (search) params.set('search', search)

    router.get(`/admin/mails?${params.toString()}`, {}, { preserveState: true })
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
    if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter)
    if (searchQuery) params.set('search', searchQuery)

    router.get(`/admin/mails?${params.toString()}`, {}, { preserveState: true })
  }

  const successRate = stats.total > 0 ? ((stats.sent + stats.delivered) / stats.total) * 100 : 0

  const renderStatusBadge = (status: EmailLog['status']) => {
    const config = STATUS_VARIANTS[status]
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1.5 w-fit">
        <Icon className="h-3 w-3" />
        {t(`admin.mails.status.${status}`)}
      </Badge>
    )
  }

  const columns: ColumnDef<EmailLog>[] = useMemo(
    () => [
      {
        accessorKey: 'recipient',
        header: t('admin.mails.column_recipient'),
        cell: ({ row }) => {
          const email = row.original
          return (
            <div className="flex flex-col gap-1">
              <span className="font-medium text-sm">{email.recipient}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                {email.subject}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: 'category',
        header: t('admin.mails.column_category'),
        cell: ({ row }) => {
          const category = row.getValue('category') as string
          return <Badge variant="outline">{category}</Badge>
        },
      },
      {
        accessorKey: 'status',
        header: t('admin.mails.column_status'),
        cell: ({ row }) => renderStatusBadge(row.getValue('status')),
      },
      {
        id: 'engagement',
        header: t('admin.mails.column_engagement'),
        cell: ({ row }) => {
          const email = row.original
          if (email.opensCount === 0 && email.clicksCount === 0) {
            return <span className="text-xs text-muted-foreground">-</span>
          }
          return (
            <div className="flex items-center gap-3 text-xs">
              {email.opensCount > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Eye className="h-3 w-3" />
                  <span>{email.opensCount}</span>
                </div>
              )}
              {email.clicksCount > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MousePointerClick className="h-3 w-3" />
                  <span>{email.clicksCount}</span>
                </div>
              )}
            </div>
          )
        },
      },
      {
        id: 'attachments',
        header: '',
        cell: ({ row }) => {
          if (!row.original.hasAttachments) return null
          return (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Paperclip className="h-4 w-4" />
            </div>
          )
        },
      },
      {
        accessorKey: 'createdAt',
        header: t('admin.mails.column_date'),
        cell: ({ row }) => {
          const dateString = row.getValue('createdAt') as string
          const date = new Date(dateString)
          return (
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(date, { locale: fr, addSuffix: true })}
            </span>
          )
        },
      },
    ],
    [t]
  )

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

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('admin.mails.stats.total_title')}
                </CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {t('admin.mails.stats.total_subtitle')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('admin.mails.stats.sent_title')}
                </CardTitle>
                <Send className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.sent + stats.delivered}</div>
                <p className="text-xs text-muted-foreground">
                  {t('admin.mails.stats.sent_subtitle', { rate: successRate.toFixed(1) })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('admin.mails.stats.failed_title')}
                </CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.failed}</div>
                <p className="text-xs text-muted-foreground">
                  {t('admin.mails.stats.failed_subtitle', {
                    rate: stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : 0,
                  })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('admin.mails.stats.delivered_title')}
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.delivered}</div>
                <p className="text-xs text-muted-foreground">
                  {t('admin.mails.stats.delivered_subtitle')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('admin.mails.stats.pending_title')}
                </CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">
                  {t('admin.mails.stats.pending_subtitle')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Input
                placeholder={t('admin.mails.search_placeholder')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  const timer = setTimeout(() => {
                    handleFilterChange(statusFilter, categoryFilter, e.target.value)
                  }, 500)
                  return () => clearTimeout(timer)
                }}
                className="max-w-sm"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value)
                handleFilterChange(value, categoryFilter, searchQuery)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('admin.mails.filter_status_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.mails.filter_status_all')}</SelectItem>
                <SelectItem value="sent">{t('admin.mails.status.sent')}</SelectItem>
                <SelectItem value="delivered">{t('admin.mails.status.delivered')}</SelectItem>
                <SelectItem value="failed">{t('admin.mails.status.failed')}</SelectItem>
                <SelectItem value="pending">{t('admin.mails.status.pending')}</SelectItem>
                <SelectItem value="opened">{t('admin.mails.status.opened')}</SelectItem>
                <SelectItem value="clicked">{t('admin.mails.status.clicked')}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value)
                handleFilterChange(statusFilter, value, searchQuery)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('admin.mails.filter_category_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.mails.filter_category_all')}</SelectItem>
                {stats.byCategory.map((cat) => (
                  <SelectItem key={cat.category} value={cat.category}>
                    {cat.category} ({cat.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <DataTable
            columns={columns}
            data={logs.data}
            getRowId={(row) => row.id}
            pagination={{
              pageIndex: logs.meta.currentPage - 1,
              pageSize: logs.meta.perPage,
            }}
            pageCount={logs.meta.lastPage}
            onPaginationChange={(updater) => {
              if (typeof updater === 'function') {
                const newState = updater({
                  pageIndex: logs.meta.currentPage - 1,
                  pageSize: logs.meta.perPage,
                })
                handlePageChange(newState.pageIndex + 1)
              }
            }}
            manualPagination
          />
        </div>
      </AdminLayout>
    </>
  )
}

export default MailsPage
