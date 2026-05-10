import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Link } from '@adonisjs/inertia/react'
import { Head, router } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plug, CheckCircle2, LogOut } from 'lucide-react'
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
import { useI18n } from '@/hooks/use-i18n'

interface StripeConfig {
  isActive: boolean
  publicKey: string
  hasSecretKey: boolean
  hasWebhookSecret: boolean
}

interface IntegrationsPageProps {
  stripe: StripeConfig | null
}

interface Integration {
  id: string
  name: string
  description: string
  category: string
  isConnected: boolean
  icon: string
  iconBg: string
}

const IntegrationsPage = ({ stripe }: IntegrationsPageProps) => {
  const { t } = useI18n()

  const integrations: Integration[] = [
    {
      id: 'stripe',
      name: 'Stripe',
      description: t('admin.integrations_list.stripe_description'),
      category: t('admin.integrations_list.category_payment'),
      isConnected: stripe?.isActive || false,
      icon: '💳',
      iconBg: 'bg-blue-100 dark:bg-blue-900',
    },
  ]

  const categories = [...new Set(integrations.map((int) => int.category))]
  const connectedCount = integrations.filter((int) => int.isConnected).length

  const handleDisconnect = () => {
    router.post('/admin/integrations/stripe/disconnect')
  }

  return (
    <>
      <Head title={t('admin.integrations_list.head_title')} />
      <AdminLayout breadcrumbs={[{ label: t('admin.integrations_list.title') }]}>
        <div className="flex flex-col gap-6 p-6">
          <PageHeader
            title={t('admin.integrations_list.title')}
            description={t('admin.integrations_list.description', {
              connected: connectedCount,
              total: integrations.length,
            })}
            icon={Plug}
          />

          {categories.map((category) => {
            const categoryIntegrations = integrations.filter((int) => int.category === category)
            return (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{category}</h3>
                  <Badge variant="outline">{categoryIntegrations.length}</Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryIntegrations.map((integration) => (
                    <Card key={integration.id} className="relative overflow-hidden">
                      {integration.isConnected && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {t('admin.integrations_list.connected')}
                          </Badge>
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-lg text-2xl ${integration.iconBg}`}
                          >
                            {integration.icon}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">{integration.name}</CardTitle>
                            <CardDescription className="mt-1 text-xs">
                              {integration.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          {integration.isConnected ? (
                            <>
                              <div className="flex-1 space-y-2">
                                <div className="text-xs text-muted-foreground">
                                  {t('admin.integrations_list.public_key', {
                                    key: stripe?.publicKey ?? '',
                                  })}
                                </div>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    {t('admin.integrations_list.disconnect')}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {t('admin.integrations_list.disconnect_dialog_title')}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('admin.integrations_list.disconnect_dialog_description')}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      {t('admin.integrations_list.dialog_cancel')}
                                    </AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDisconnect}>
                                      {t('admin.integrations_list.disconnect')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          ) : (
                            <Link href="/admin/integrations/stripe/connect" className="w-full">
                              <Button size="sm" className="w-full">
                                <Plug className="mr-2 h-4 w-4" />
                                {t('admin.integrations_list.connect_stripe')}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">
                {t('admin.integrations_list.missing_card_title')}
              </CardTitle>
              <CardDescription>
                {t('admin.integrations_list.missing_card_description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  {t('admin.integrations_list.suggest_button')}
                </Button>
                <Button variant="ghost" size="sm">
                  {t('admin.integrations_list.docs_button')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </>
  )
}

export default IntegrationsPage
