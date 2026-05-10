import { Link } from '@adonisjs/inertia/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useI18n } from '@/hooks/use-i18n'
import { formatAction, getActionBadgeVariant } from './helpers'
import type { AuditLog } from './types'

interface Props {
  auditLogs: AuditLog[]
}

export function UserAuditLogsCard({ auditLogs }: Props) {
  const { t, locale } = useI18n()
  const distanceLocale = locale === 'en' ? enUS : fr

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            {t('admin.user_detail.audit_logs_title', { count: auditLogs.length })}
          </CardTitle>
          {auditLogs.length > 0 && (
            <Link href="/admin/audit-logs">
              <Button variant="outline" size="sm">
                {t('admin.user_detail.audit_logs_view_all')}
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('admin.user_detail.empty_audit_logs')}
          </p>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between border border-border/80 rounded-md p-4"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getActionBadgeVariant(log.action)} className="text-xs">
                      {formatAction(log.action)}
                    </Badge>
                    {log.resourceType && (
                      <span className="text-xs text-muted-foreground">{log.resourceType}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {log.ipAddress && <span className="font-mono">{log.ipAddress}</span>}
                    <span>·</span>
                    <span>
                      {t('admin.user_detail.audit_log_time_ago', {
                        time: formatDistanceToNow(new Date(log.createdAt), {
                          locale: distanceLocale,
                        }),
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
