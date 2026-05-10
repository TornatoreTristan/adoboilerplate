import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Eye, MousePointerClick, Paperclip } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useI18n } from '@/hooks/use-i18n'
import { EmailStatusBadge } from './email-status-badge'
import type { EmailLog, MailsLogsPayload } from './types'

interface Props {
  logs: MailsLogsPayload
  onPageChange: (page: number) => void
}

export function MailsTable({ logs, onPageChange }: Props) {
  const { t, locale } = useI18n()
  const distanceLocale = locale === 'en' ? enUS : fr

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
        cell: ({ row }) => <Badge variant="outline">{row.getValue('category') as string}</Badge>,
      },
      {
        accessorKey: 'status',
        header: t('admin.mails.column_status'),
        cell: ({ row }) => <EmailStatusBadge status={row.original.status} />,
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
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(row.getValue('createdAt') as string), {
              locale: distanceLocale,
              addSuffix: true,
            })}
          </span>
        ),
      },
    ],
    [t, distanceLocale]
  )

  return (
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
          onPageChange(newState.pageIndex + 1)
        }
      }}
      manualPagination
    />
  )
}
