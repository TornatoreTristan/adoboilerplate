import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import AccountLayout from '@/components/layouts/account-layout'
import TwoFactorSetupWizard from '@/components/auth/two-factor-setup-wizard'
import TwoFactorBackupCodes from '@/components/auth/two-factor-backup-codes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ShieldCheck, ShieldOff, AlertTriangle } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { useFormatDate } from '@/hooks/use-format-date'

interface Props {
  status: {
    enabled: boolean
    confirmedAt: string | null
    remainingBackupCodes: number
  }
}

type ViewMode = 'idle' | 'setup' | 'backup-codes'

export default function Security({ status }: Props) {
  const { t } = useI18n()
  const formatDate = useFormatDate()
  const [view, setView] = useState<ViewMode>('idle')
  const [freshBackupCodes, setFreshBackupCodes] = useState<string[] | null>(null)

  const [disablePassword, setDisablePassword] = useState('')
  const [disableError, setDisableError] = useState<string | null>(null)
  const [disableProcessing, setDisableProcessing] = useState(false)
  const [regenerateProcessing, setRegenerateProcessing] = useState(false)

  const onSetupComplete = (codes: string[]) => {
    setFreshBackupCodes(codes)
    setView('backup-codes')
  }

  const onCloseBackupCodes = () => {
    setFreshBackupCodes(null)
    setView('idle')
    router.reload({ only: ['status'] })
  }

  const handleDisable = async () => {
    setDisableError(null)
    setDisableProcessing(true)
    try {
      const res = await fetch('/auth/2fa', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': decodeURIComponent(
            document.cookie
              .split('; ')
              .find((c) => c.startsWith('XSRF-TOKEN='))
              ?.split('=')[1] ?? ''
          ),
          'Accept': 'application/json',
        },
        body: JSON.stringify({ password: disablePassword }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setDisableError(body?.error?.message ?? t('account.security.field_password'))
        return
      }
      setDisablePassword('')
      router.reload({ only: ['status'] })
    } finally {
      setDisableProcessing(false)
    }
  }

  const handleRegenerate = async () => {
    setRegenerateProcessing(true)
    try {
      const res = await fetch('/auth/2fa/backup-codes/regenerate', {
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': decodeURIComponent(
            document.cookie
              .split('; ')
              .find((c) => c.startsWith('XSRF-TOKEN='))
              ?.split('=')[1] ?? ''
          ),
          'Accept': 'application/json',
        },
      })
      if (res.ok) {
        const body = (await res.json()) as { backupCodes: string[] }
        setFreshBackupCodes(body.backupCodes)
        setView('backup-codes')
      }
    } finally {
      setRegenerateProcessing(false)
    }
  }

  return (
    <>
      <Head title={t('account.security.title')} />
      <AccountLayout>
        <div className="max-w-3xl space-y-6">
          {view === 'backup-codes' && freshBackupCodes ? (
            <TwoFactorBackupCodes codes={freshBackupCodes} onDone={onCloseBackupCodes} />
          ) : view === 'setup' ? (
            <TwoFactorSetupWizard onComplete={onSetupComplete} onCancel={() => setView('idle')} />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {status.enabled ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <ShieldOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <CardTitle>{t('account.security.two_factor_card_title')}</CardTitle>
                  <Badge variant={status.enabled ? 'default' : 'secondary'} className="ml-auto">
                    {status.enabled
                      ? t('account.security.status_enabled')
                      : t('account.security.status_disabled')}
                  </Badge>
                </div>
                <CardDescription>
                  {t('account.security.two_factor_card_description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {status.enabled && status.confirmedAt && (
                  <p className="text-sm text-muted-foreground">
                    {t('account.security.status_enabled_since', {
                      date: formatDate(status.confirmedAt, 'short'),
                    })}
                  </p>
                )}

                {status.enabled && (
                  <>
                    <p className="text-sm">
                      {t('account.security.backup_codes_remaining', {
                        count: status.remainingBackupCodes,
                      })}
                    </p>

                    {status.remainingBackupCodes <= 2 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {t('account.security.backup_codes_low_warning')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  {!status.enabled ? (
                    <Button onClick={() => setView('setup')}>
                      {t('account.security.enable_2fa')}
                    </Button>
                  ) : (
                    <>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" disabled={regenerateProcessing}>
                            {t('account.security.regenerate_backup_codes')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t('account.security.regenerate_dialog_title')}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('account.security.regenerate_dialog_description')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              {t('account.security.cancel_setup')}
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handleRegenerate}>
                              {t('account.security.regenerate_confirm')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">{t('account.security.disable_2fa')}</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t('account.security.disable_dialog_title')}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('account.security.disable_dialog_description')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="space-y-2">
                            <Label htmlFor="disable-password">
                              {t('account.security.field_password')}
                            </Label>
                            <Input
                              id="disable-password"
                              type="password"
                              value={disablePassword}
                              onChange={(e) => setDisablePassword(e.target.value)}
                              autoComplete="current-password"
                            />
                            {disableError && (
                              <p className="text-sm text-destructive">{disableError}</p>
                            )}
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              onClick={() => {
                                setDisablePassword('')
                                setDisableError(null)
                              }}
                            >
                              {t('account.security.cancel_setup')}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDisable}
                              disabled={!disablePassword || disableProcessing}
                            >
                              {t('account.security.confirm_disable')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </AccountLayout>
    </>
  )
}
