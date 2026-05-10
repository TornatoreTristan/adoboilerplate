import { Link } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'
import AppLayout from '@/components/layouts/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'

interface Props {
  sessionId?: string
}

const SubscriptionSuccessPage = ({ sessionId }: Props) => {
  const { t } = useI18n()
  return (
    <>
      <Head title={t('organizations.subscription_success.head_title')} />
      <AppLayout>
        <div className="flex items-center justify-center min-h-[80vh] p-6">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
                  <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <CardTitle className="text-2xl">
                {t('organizations.subscription_success.title')}
              </CardTitle>
              <CardDescription>
                {t('organizations.subscription_success.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessionId && (
                <div className="text-sm text-muted-foreground text-center">
                  {t('organizations.subscription_success.session_id_label')}{' '}
                  <code className="text-xs">{sessionId}</code>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button asChild className="w-full" size="lg">
                  <Link href="/organizations/settings/subscriptions">
                    {t('organizations.subscription_success.view_subscription')}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/">{t('organizations.subscription_success.back_home')}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </>
  )
}

export default SubscriptionSuccessPage
