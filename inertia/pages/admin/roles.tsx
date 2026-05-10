import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head, router } from '@inertiajs/react'
import { Badge } from '@/components/ui/badge'
import { Shield, Key, Lock } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { DateRangeFilter, type DateRange } from '@/components/ui/date-range-filter'
import { useState, useMemo } from 'react'
import { isWithinInterval } from 'date-fns'
import { useI18n } from '@/hooks/use-i18n'

interface Role {
  id: string
  name: string
  slug: string
  description: string | null
  isSystem: boolean
  createdAt: string
  permissionsCount: number
}

interface RolesPageProps {
  roles: Role[]
}

const RolesPage = ({ roles }: RolesPageProps) => {
  const { t, locale } = useI18n()
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const filteredRoles = useMemo(() => {
    if (!dateRange?.from) return roles
    return roles.filter((role) => {
      const roleDate = new Date(role.createdAt)
      if (dateRange.from && dateRange.to) {
        return isWithinInterval(roleDate, { start: dateRange.from, end: dateRange.to })
      }
      if (dateRange.from) return roleDate >= dateRange.from
      return true
    })
  }, [roles, dateRange])

  const systemRolesCount = roles.filter((role) => role.isSystem).length
  const totalPermissions = roles.reduce((sum, role) => sum + role.permissionsCount, 0)

  const columns: ColumnDef<Role>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('admin.roles_list.col_role'),
        cell: ({ row }) => {
          const role = row.original
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                {role.isSystem ? (
                  <Lock className="h-5 w-5 text-primary" />
                ) : (
                  <Shield className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-medium">{role.name}</p>
                <p className="text-xs text-muted-foreground">{role.slug}</p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'description',
        header: t('admin.roles_list.col_description'),
        cell: ({ row }) => {
          const description = row.getValue('description') as string | null
          return description ? (
            <span className="text-sm text-muted-foreground line-clamp-2 max-w-[300px]">
              {description}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground italic">
              {t('admin.roles_list.no_description')}
            </span>
          )
        },
      },
      {
        accessorKey: 'isSystem',
        header: t('admin.roles_list.col_type'),
        cell: ({ row }) => {
          const isSystem = row.getValue('isSystem')
          return isSystem ? (
            <Badge variant="default" className="flex items-center gap-1 w-fit">
              <Lock className="h-3 w-3" />
              {t('admin.roles_list.type_system')}
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1 w-fit">
              <Shield className="h-3 w-3" />
              {t('admin.roles_list.type_custom')}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'permissionsCount',
        header: t('admin.roles_list.col_permissions'),
        cell: ({ row }) => {
          const count = row.getValue('permissionsCount') as number
          return (
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{count}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'createdAt',
        header: t('admin.roles_list.col_created_at'),
        cell: ({ row }) => {
          const dateString = row.getValue('createdAt') as string
          const date = new Date(dateString)
          return (
            <span className="text-sm text-muted-foreground">
              {new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
                dateStyle: 'medium',
              }).format(date)}
            </span>
          )
        },
      },
    ],
    [t, locale]
  )

  return (
    <>
      <Head title={t('admin.roles_list.head_title')} />
      <AdminLayout breadcrumbs={[{ label: t('admin.roles_list.title') }]}>
        <div className="flex flex-col gap-6 p-6">
          <PageHeader
            title={t('admin.roles_list.title')}
            description={t('admin.roles_list.description', {
              count: filteredRoles.length,
              system: systemRolesCount,
              permissions: totalPermissions,
            })}
            icon={Shield}
          />

          <DataTable
            columns={columns}
            data={filteredRoles}
            searchKey="name"
            searchPlaceholder={t('admin.roles_list.search_placeholder')}
            customFilters={<DateRangeFilter value={dateRange} onChange={setDateRange} />}
            getRowId={(row) => row.id}
            onRowClick={(role) => router.visit(`/admin/roles/${role.id}`)}
          />
        </div>
      </AdminLayout>
    </>
  )
}

export default RolesPage
