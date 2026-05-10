import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/core/empty-state'
import { useI18n } from '@/hooks/use-i18n'
import { useRelativeDate } from '@/hooks/use-relative-date'
import { getDeviceIcon } from './helpers'
import type { Session } from './types'

interface Props {
  sessions: Session[]
}

export function UserSessionsCard({ sessions }: Props) {
  const { t } = useI18n()
  const formatRelative = useRelativeDate()

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('admin.user_detail.sessions_title', { count: sessions.length })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <EmptyState message={t('admin.user_detail.empty_sessions')} />
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start justify-between border border-border/80 rounded-md p-4"
              >
                <div className="flex gap-3">
                  <div className="text-muted-foreground mt-1">
                    {getDeviceIcon(session.deviceType)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {t('admin.user_detail.session_browser_label', {
                          browser:
                            session.browser || t('admin.user_detail.session_browser_unknown'),
                          os: session.os || t('admin.user_detail.session_os_unknown'),
                        })}
                      </span>
                      {session.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          {t('admin.user_detail.session_active_badge')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.ipAddress}
                      {session.city && session.country && (
                        <>
                          {' '}
                          · {session.city}, {session.country}
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('admin.user_detail.session_last_activity', {
                        time: formatRelative(session.lastActivity, { addSuffix: false }),
                      })}
                    </p>
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
