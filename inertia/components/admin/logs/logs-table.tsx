import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDistanceToNow } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useI18n } from '@/hooks/use-i18n'
import { LogLevelBadge, StatusCodeBadge } from './log-level-badge'
import type { Log } from './types'

interface Props {
  logs: Log[]
  loading: boolean
  onSelect: (log: Log) => void
}

export function LogsTable({ logs, loading, onSelect }: Props) {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'en' ? enUS : fr

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.logs.col_level')}</TableHead>
              <TableHead>{t('admin.logs.col_message')}</TableHead>
              <TableHead>{t('admin.logs.col_method')}</TableHead>
              <TableHead>{t('admin.logs.col_url')}</TableHead>
              <TableHead>{t('admin.logs.col_status')}</TableHead>
              <TableHead>{t('admin.logs.col_user')}</TableHead>
              <TableHead>{t('admin.logs.col_time')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t('admin.logs.loading')}
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t('admin.logs.no_results')}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow
                  key={log.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelect(log)}
                >
                  <TableCell>
                    <LogLevelBadge level={log.level} />
                  </TableCell>
                  <TableCell className="max-w-md truncate">{log.message}</TableCell>
                  <TableCell>
                    {log.method && <Badge variant="outline">{log.method}</Badge>}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {log.url}
                  </TableCell>
                  <TableCell>
                    <StatusCodeBadge code={log.statusCode} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.user ? log.user.fullName || log.user.email : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(log.createdAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
