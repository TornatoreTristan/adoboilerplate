import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head, router } from '@inertiajs/react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Building2, Users } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { DateRangeFilter, type DateRange } from '@/components/ui/date-range-filter'
import { useState, useMemo } from 'react'
import { isWithinInterval } from 'date-fns'
import { useI18n } from '@/hooks/use-i18n'
import { useFormatDate } from '@/hooks/use-format-date'

interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  website: string | null
  isActive: boolean
  createdAt: string
  membersCount: number
}

interface OrganizationsPageProps {
  organizations: Organization[]
}

const OrganizationsPage = ({ organizations }: OrganizationsPageProps) => {
  const { t } = useI18n()
  const formatDate = useFormatDate()
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const filteredOrganizations = useMemo(() => {
    if (!dateRange?.from) return organizations

    return organizations.filter((org) => {
      const orgDate = new Date(org.createdAt)
      if (dateRange.from && dateRange.to) {
        return isWithinInterval(orgDate, { start: dateRange.from, end: dateRange.to })
      }
      if (dateRange.from) return orgDate >= dateRange.from
      return true
    })
  }, [organizations, dateRange])

  const activeCount = organizations.filter((org) => org.isActive).length
  const totalMembers = organizations.reduce((sum, org) => sum + org.membersCount, 0)

  const columns: ColumnDef<Organization>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('admin.organizations_list.col_organization'),
        cell: ({ row }) => {
          const org = row.original
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{org.name}</p>
                <p className="text-xs text-muted-foreground">/{org.slug}</p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'description',
        header: t('admin.organizations_list.col_description'),
        cell: ({ row }) => {
          const description = row.getValue('description') as string | null
          return description ? (
            <span className="text-sm text-muted-foreground line-clamp-2 max-w-[300px]">
              {description}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground italic">
              {t('admin.organizations_list.no_description')}
            </span>
          )
        },
      },
      {
        accessorKey: 'website',
        header: t('admin.organizations_list.col_website'),
        cell: ({ row }) => {
          const website = row.getValue('website') as string | null
          return website ? (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {website}
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )
        },
      },
      {
        accessorKey: 'isActive',
        header: t('admin.organizations_list.col_status'),
        cell: ({ row }) => {
          const isActive = row.getValue('isActive')
          return isActive ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">{t('admin.organizations_list.status_active')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-orange-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">{t('admin.organizations_list.status_inactive')}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'membersCount',
        header: t('admin.organizations_list.col_members'),
        cell: ({ row }) => {
          const count = row.getValue('membersCount') as number
          return (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{count}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'createdAt',
        header: t('admin.organizations_list.col_created_at'),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.getValue('createdAt') as string, 'medium')}
          </span>
        ),
      },
    ],
    [t, formatDate]
  )

  return (
    <>
      <Head title={t('admin.organizations_list.head_title')} />
      <AdminLayout breadcrumbs={[{ label: t('admin.organizations_list.title') }]}>
        <div className="flex flex-col gap-6 p-6">
          <PageHeader
            title={t('admin.organizations_list.title')}
            description={t('admin.organizations_list.description', {
              count: filteredOrganizations.length,
              active: activeCount,
              members: totalMembers,
            })}
            icon={Building2}
          />

          <DataTable
            columns={columns}
            data={filteredOrganizations}
            searchKey="name"
            searchPlaceholder={t('admin.organizations_list.search_placeholder')}
            customFilters={<DateRangeFilter value={dateRange} onChange={setDateRange} />}
            getRowId={(row) => row.id}
            onRowClick={(org) => router.visit(`/admin/organizations/${org.id}`)}
          />
        </div>
      </AdminLayout>
    </>
  )
}

export default OrganizationsPage
