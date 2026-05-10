import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useI18n } from '@/hooks/use-i18n'
import { LogLevelBadge } from './log-level-badge'
import type { Log } from './types'

interface Props {
  log: Log | null
  onOpenChange: (open: boolean) => void
}

export function LogDetailDialog({ log, onOpenChange }: Props) {
  const { t, locale } = useI18n()

  return (
    <Dialog open={!!log} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {log && <LogLevelBadge level={log.level} />}
            {t('admin.logs.detail_title')}
          </DialogTitle>
        </DialogHeader>
        {log && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">{t('admin.logs.detail_message')}</h4>
              <p className="text-sm">{log.message}</p>
            </div>

            {log.url && (
              <div>
                <h4 className="font-semibold mb-2">{t('admin.logs.detail_request')}</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="font-medium">{t('admin.logs.detail_method')}</span>{' '}
                    {log.method}
                  </p>
                  <p className="break-all">
                    <span className="font-medium">{t('admin.logs.detail_url')}</span>{' '}
                    {log.url}
                  </p>
                  {log.statusCode && (
                    <p>
                      <span className="font-medium">{t('admin.logs.detail_status')}</span>{' '}
                      {log.statusCode}
                    </p>
                  )}
                </div>
              </div>
            )}

            {log.user && (
              <div>
                <h4 className="font-semibold mb-2">{t('admin.logs.detail_user')}</h4>
                <div className="text-sm space-y-1">
                  <p>{log.user.fullName || log.user.email}</p>
                  <p className="text-muted-foreground">
                    {t('admin.logs.detail_user_id')} {log.user.id}
                  </p>
                </div>
              </div>
            )}

            {log.ip && (
              <div>
                <h4 className="font-semibold mb-2">{t('admin.logs.detail_client')}</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="font-medium">{t('admin.logs.detail_ip')}</span>{' '}
                    {log.ip}
                  </p>
                  {log.userAgent && (
                    <p className="break-all">
                      <span className="font-medium">{t('admin.logs.detail_user_agent')}</span>{' '}
                      {log.userAgent}
                    </p>
                  )}
                </div>
              </div>
            )}

            {log.context && Object.keys(log.context).length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">{t('admin.logs.detail_context')}</h4>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                  {JSON.stringify(log.context, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-2">{t('admin.logs.detail_timestamp')}</h4>
              <p className="text-sm">
                {new Date(log.createdAt).toLocaleString(
                  locale === 'en' ? 'en-US' : 'fr-FR',
                  {
                    dateStyle: 'full',
                    timeStyle: 'long',
                  }
                )}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
