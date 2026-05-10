import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head, router } from '@inertiajs/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, MoreHorizontal, Pencil, Trash } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { DateRangeFilter } from '@/components/ui/date-range-filter'
import { useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { useRelativeDate } from '@/hooks/use-relative-date'
import { useFormatDate } from '@/hooks/use-format-date'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useI18n } from '@/hooks/use-i18n'
import { useInertiaTableQuery } from '@/hooks/use-inertia-table-query'

interface User {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  googleId: string | null
  isEmailVerified: boolean
  createdAt: string
  lastActivity: string | null
}

interface UsersFilters {
  search: string
  dateFrom: string
  dateTo: string
}

interface UsersPageProps {
  users: User[]
  meta: { total: number; perPage: number; currentPage: number; lastPage: number }
  filters: UsersFilters
}

const UsersPage = ({ users, meta, filters: initialFilters }: UsersPageProps) => {
  const { t } = useI18n()
  const formatRelative = useRelativeDate()
  const formatDate = useFormatDate()

  const { filters, page, setSearch, setFilter, setPage } = useInertiaTableQuery<UsersFilters>({
    url: '/admin/users',
    initial: initialFilters,
    initialPage: meta.currentPage,
    only: ['users', 'meta', 'filters'],
  })

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    initialFilters.dateFrom || initialFilters.dateTo
      ? {
          from: initialFilters.dateFrom ? new Date(initialFilters.dateFrom) : undefined,
          to: initialFilters.dateTo ? new Date(initialFilters.dateTo) : undefined,
        }
      : undefined
  )

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
    setFilter('dateFrom', range?.from ? range.from.toISOString() : '')
    setFilter('dateTo', range?.to ? range.to.toISOString() : '')
  }

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label={t('admin.users.select_all')}
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={t('admin.users.select_row')}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'fullName',
        header: t('admin.users.column_user'),
        cell: ({ row }) => {
          const user = row.original
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatarUrl || ''} alt={user.fullName || ''} />
                <AvatarFallback>
                  {user.fullName
                    ? user.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                    : user.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user.fullName || t('admin.users.no_name')}</p>
                <p className="text-xs text-muted-foreground">ID: {user.id}</p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'email',
        header: t('admin.users.column_email'),
        cell: ({ row }) => <span className="text-sm">{row.getValue('email')}</span>,
      },
      {
        accessorKey: 'isEmailVerified',
        header: t('admin.users.column_status'),
        cell: ({ row }) => {
          const isVerified = row.getValue('isEmailVerified')
          return isVerified ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">{t('admin.users.verified')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-orange-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">{t('admin.users.not_verified')}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'googleId',
        header: t('admin.users.column_type'),
        cell: ({ row }) => {
          const googleId = row.getValue('googleId')
          return googleId ? (
            <Badge variant="secondary">Google</Badge>
          ) : (
            <Badge variant="outline">Email</Badge>
          )
        },
      },
      {
        accessorKey: 'createdAt',
        header: t('admin.users.column_signup'),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.getValue('createdAt') as string, 'medium')}
          </span>
        ),
      },
      {
        accessorKey: 'lastActivity',
        header: t('admin.users.column_last_login'),
        cell: ({ row }) => {
          const dateString = row.getValue('lastActivity') as string | null
          if (!dateString) {
            return (
              <span className="text-sm text-muted-foreground">
                {t('admin.users.never_logged_in')}
              </span>
            )
          }
          return (
            <span className="text-sm text-muted-foreground">
              {t('admin.users.time_ago', {
                time: formatRelative(dateString, { addSuffix: false }),
              })}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: t('common.actions'),
        cell: ({ row }) => {
          const user = row.original
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">{t('admin.users.open_menu')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.visit(`/admin/users/${user.id}`)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t('common.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive">
                    <Trash className="mr-2 h-4 w-4" />
                    {t('common.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t, formatDate, formatRelative]
  )

  const countLabel =
    meta.total > 1
      ? t('admin.users.count_plural', { count: meta.total })
      : t('admin.users.count_singular', { count: meta.total })

  return (
    <>
      <Head title={t('admin.users.head_title')} />
      <AdminLayout breadcrumbs={[{ label: t('admin.users.title') }]}>
        <div className="flex flex-col gap-6 p-6">
          <PageHeader title={t('admin.users.title')} description={countLabel} />

          <DataTable
            columns={columns}
            data={users}
            getRowId={(row) => row.id}
            onRowClick={(user) => router.visit(`/admin/users/${user.id}`)}
            serverSearch={{
              value: filters.search,
              onChange: (value) => setSearch('search', value),
              placeholder: t('admin.users.search_placeholder'),
            }}
            serverPagination={{
              page,
              perPage: meta.perPage,
              total: meta.total,
              lastPage: meta.lastPage,
              onPageChange: setPage,
            }}
            customFilters={
              <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
            }
          />
        </div>
      </AdminLayout>
    </>
  )
}

export default UsersPage
