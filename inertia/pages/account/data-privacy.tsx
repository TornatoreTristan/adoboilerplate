import { Head, router } from '@inertiajs/react'
import AccountLayout from '@/components/layouts/account-layout'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { Download, Trash2, Shield, FileText, AlertTriangle } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { useState } from 'react'
import { toast } from 'sonner'

export default function DataPrivacy() {
  const { t } = useI18n()
  const [deletionReason, setDeletionReason] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/account/data-export')
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my-data-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success(t('account.data_exported'))
    } catch (error) {
      toast.error(t('account.export_failed'))
    } finally {
      setIsExporting(false)
    }
  }

  const handleRequestDeletion = () => {
    router.post(
      '/account/delete-request',
      { reason: deletionReason },
      {
        onSuccess: () => {
          toast.success(t('account.deletion_requested'))
        },
        onError: () => {
          toast.error(t('account.deletion_failed'))
        },
      }
    )
  }

  return (
    <>
      <Head title={t('account.data_privacy')} />
      <AccountLayout>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">{t('account.data_privacy')}</h3>
            <p className="text-sm text-muted-foreground">{t('account.data_privacy_description')}</p>
          </div>
          <Separator />

          {/* Export des données */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                {t('account.export_my_data')}
              </CardTitle>
              <CardDescription>{t('account.export_data_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>{t('account.export_data_includes')}</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{t('account.export_profile')}</li>
                  <li>{t('account.export_organizations')}</li>
                  <li>{t('account.export_notifications')}</li>
                  <li>{t('account.export_uploads')}</li>
                  <li>{t('account.export_sessions')}</li>
                  <li>{t('account.export_subscriptions')}</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleExportData} disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? t('common.loading') : t('account.download_data')}
              </Button>
            </CardFooter>
          </Card>

          {/* Conformité RGPD */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('account.gdpr_compliance')}
              </CardTitle>
              <CardDescription>{t('account.gdpr_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <h4 className="font-medium text-foreground mb-2">{t('account.your_rights')}</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>{t('account.right_to_access')}</li>
                    <li>{t('account.right_to_rectification')}</li>
                    <li>{t('account.right_to_erasure')}</li>
                    <li>{t('account.right_to_portability')}</li>
                    <li>{t('account.right_to_restriction')}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">
                    {t('account.data_retention')}
                  </h4>
                  <p>{t('account.data_retention_description')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suppression du compte */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {t('account.delete_account')}
              </CardTitle>
              <CardDescription>{t('account.delete_account_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="bg-destructive/10 p-4 rounded-md">
                  <h4 className="font-medium text-destructive mb-2">
                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                    {t('account.warning')}
                  </h4>
                  <p>{t('account.delete_warning')}</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">
                    {t('account.what_will_be_deleted')}
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>{t('account.delete_profile')}</li>
                    <li>{t('account.delete_organizations')}</li>
                    <li>{t('account.delete_uploads')}</li>
                    <li>{t('account.delete_sessions')}</li>
                    <li>{t('account.delete_subscriptions')}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">{t('account.grace_period')}</h4>
                  <p>{t('account.grace_period_description')}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('account.request_deletion')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('account.confirm_deletion')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('account.confirm_deletion_description')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium">
                        {t('account.deletion_reason_optional')}
                      </label>
                      <Textarea
                        value={deletionReason}
                        onChange={(e) => setDeletionReason(e.target.value)}
                        placeholder={t('account.deletion_reason_placeholder')}
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRequestDeletion} className="bg-destructive">
                      {t('account.confirm_request_deletion')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        </div>
      </AccountLayout>
    </>
  )
}
