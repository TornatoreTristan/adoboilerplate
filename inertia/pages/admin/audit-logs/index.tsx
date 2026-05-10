import { useState, useMemo } from 'react'
import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head } from '@inertiajs/react'
import { Badge } from '@/components/ui/badge'
import { Shield } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { useRelativeDate } from '@/hooks/use-relative-date'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { DateRangeFilter, type DateRange } from '@/components/ui/date-range-filter'
import { isWithinInterval } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, User, Building2 } from 'lucide-react'

interface AuditLog {
  id: string
  userId: string | null
  organizationId: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, any> | null
  createdAt: string
  user?: {
    id: string
    email: string
    fullName: string | null
  }
  organization?: {
    id: string
    name: string
  }
}

interface AuditLogStats {
  totalLogs: number
  uniqueUsers: number
  uniqueOrganizations: number
  topActions: Array<{ action: string; count: number }>
}

interface Props {
  logs: AuditLog[]
  total: number
  hasMore: boolean
  filters: {
    userId?: string
    organizationId?: string
    action?: string
    resourceType?: string
    search?: string
    limit: number
    offset: number
  }
  stats: AuditLogStats
}

const getActionBadgeVariant = (action: string): 'default' | 'secondary' | 'destructive' => {
  if (action.includes('deleted') || action.includes('failed')) return 'destructive'
  if (action.includes('created') || action.includes('success')) return 'default'
  return 'secondary'
}

const formatAction = (action: string): string => {
  const parts = action.split('.')
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

export default function AuditLogs({ logs, total, hasMore, filters, stats }: Props) {
  const { t } = useI18n()
  const formatRelative = useRelativeDate()
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const filteredLogs = useMemo(() => {
    if (!dateRange?.from) {
      return logs
    }

    return logs.filter((log) => {
      const logDate = new Date(log.createdAt)

      if (dateRange.from && dateRange.to) {
        return isWithinInterval(logDate, { start: dateRange.from, end: dateRange.to })
      }

      if (dateRange.from) {
        return logDate >= dateRange.from
      }

      return true
    })
  }, [logs, dateRange])

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'action',
      header: t('admin.audit_logs.table.action'),
      cell: ({ row }) => {
        const action = row.getValue('action') as string
        return (
          <Badge variant={getActionBadgeVariant(action)} className="font-mono text-xs">
            {formatAction(action)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'user',
      header: t('admin.audit_logs.table.user'),
      cell: ({ row }) => {
        const user = row.original.user
        return user ? (
          <span className="text-sm">{user.fullName || user.email}</span>
        ) : (
          <span className="text-sm text-muted-foreground">{t('common.system')}</span>
        )
      },
    },
    {
      accessorKey: 'organization',
      header: t('admin.audit_logs.table.organization'),
      cell: ({ row }) => {
        const org = row.original.organization
        return org ? (
          <span className="text-sm">{org.name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">{t('common.none')}</span>
        )
      },
    },
    {
      accessorKey: 'resourceType',
      header: t('admin.audit_logs.table.resource'),
      cell: ({ row }) => {
        const resourceType = row.getValue('resourceType') as string | null
        return resourceType ? (
          <span className="text-sm">{resourceType}</span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )
      },
    },
    {
      accessorKey: 'ipAddress',
      header: t('admin.audit_logs.table.ip_address'),
      cell: ({ row }) => {
        const ip = row.getValue('ipAddress') as string | null
        return ip ? (
          <span className="text-xs font-mono text-muted-foreground">{ip}</span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: t('admin.audit_logs.table.date'),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatRelative(row.getValue('createdAt') as string)}
        </span>
      ),
    },
  ]

  return (
    <>
      <Head title={t('admin.audit_logs.title')} />
      <AdminLayout breadcrumbs={[{ label: t('admin.audit_logs.title') }]}>
        <div className="flex flex-col gap-6 p-6">
          <PageHeader
            title={t('admin.audit_logs.title')}
            description={t('admin.audit_logs.description')}
            icon={Shield}
          />

          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('admin.audit_logs.stats.total_logs')}
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('admin.audit_logs.stats.unique_users')}
                </CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.uniqueUsers.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('admin.audit_logs.stats.unique_organizations')}
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.uniqueOrganizations.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('admin.audit_logs.stats.top_action')}
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {stats.topActions[0]
                    ? formatAction(stats.topActions[0].action)
                    : t('common.none')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.topActions[0] ? `${stats.topActions[0].count} ${t('common.times')}` : '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Audit Logs Table */}
          <DataTable
            columns={columns}
            data={filteredLogs}
            searchKey="action"
            searchPlaceholder={t('admin.audit_logs.search.placeholder')}
            customFilters={<DateRangeFilter value={dateRange} onChange={setDateRange} />}
            getRowId={(row) => row.id}
          />
        </div>
      </AdminLayout>
    </>
  )
}
