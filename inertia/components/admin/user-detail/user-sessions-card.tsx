import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useI18n } from '@/hooks/use-i18n'
import { getDeviceIcon } from './helpers'
import type { Session } from './types'

interface Props {
  sessions: Session[]
}

export function UserSessionsCard({ sessions }: Props) {
  const { t, locale } = useI18n()
  const distanceLocale = locale === 'en' ? enUS : fr

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('admin.user_detail.sessions_title', { count: sessions.length })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('admin.user_detail.empty_sessions')}
          </p>
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
                        time: formatDistanceToNow(new Date(session.lastActivity), {
                          locale: distanceLocale,
                        }),
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
