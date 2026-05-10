import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Link } from '@adonisjs/inertia/react'
import { Head, router } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, CreditCard, Eye, EyeOff, Check, X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useI18n } from '@/hooks/use-i18n'
import {
  getTranslation,
  type TranslatableField,
  type TranslatableFieldNullable,
} from '@/lib/translatable'

interface Plan {
  id: string
  nameI18n: TranslatableField
  slug: string
  descriptionI18n: TranslatableFieldNullable | null
  priceMonthly: number
  priceYearly: number
  currency: string
  trialDays: number | null
  features: string[] | null
  limits: Record<string, any> | null
  isActive: boolean
  isVisible: boolean
  sortOrder: number
  stripeProductId: string | null
  stripePriceIdMonthly: string | null
  stripePriceIdYearly: string | null
  activeSubscriptions: number
  createdAt: string
  updatedAt: string | null
}

interface PlansIndexProps {
  plans: Plan[]
}

const PlansIndexPage = ({ plans }: PlansIndexProps) => {
  const { t, locale } = useI18n()
  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
      style: 'currency',
      currency,
    }).format(price)

  const handleDelete = (planId: string, planName: string) => {
    if (confirm(t('admin.plans_list.delete_confirm', { name: planName }))) {
      router.delete(`/admin/plans/${planId}`)
    }
  }

  const handleSyncStripe = (planId: string) => {
    router.post(`/admin/plans/${planId}/sync-stripe`)
  }

  return (
    <>
      <Head title={t('admin.plans_list.head_title')} />
      <AdminLayout breadcrumbs={[{ label: t('admin.plans') }]}>
        <div className="flex flex-col gap-6 p-6">
          <PageHeader
            title={t('admin.plans_list.title')}
            description={t('admin.plans_list.description', { count: plans.length })}
            icon={CreditCard}
            separator={false}
            actions={
              <Link href="/admin/plans/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('admin.plans_list.new_plan')}
                </Button>
              </Link>
            }
          />

          <Card>
            <CardHeader>
              <CardTitle>{t('admin.plans_list.list_title')}</CardTitle>
              <CardDescription>{t('admin.plans_list.list_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">{t('admin.plans_list.empty_title')}</p>
                  <p className="text-sm mt-2">{t('admin.plans_list.empty_subtitle')}</p>
                  <Link href="/admin/plans/create" className="inline-block mt-4">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('admin.plans_list.create_plan')}
                    </Button>
                  </Link>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.plans_list.col_plan')}</TableHead>
                      <TableHead>{t('admin.plans_list.col_price')}</TableHead>
                      <TableHead>{t('admin.plans_list.col_trial')}</TableHead>
                      <TableHead>{t('admin.plans_list.col_subscribers')}</TableHead>
                      <TableHead>{t('admin.plans_list.col_status')}</TableHead>
                      <TableHead>{t('admin.plans_list.col_stripe')}</TableHead>
                      <TableHead className="text-right">
                        {t('admin.plans_list.col_actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => {
                      const planName = getTranslation(plan.nameI18n)
                      return (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{planName}</div>
                              <div className="text-xs text-muted-foreground">{plan.slug}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {t('admin.plans_list.price_per_month', {
                                price: formatPrice(plan.priceMonthly, plan.currency),
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t('admin.plans_list.price_per_year', {
                                price: formatPrice(plan.priceYearly, plan.currency),
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            {plan.trialDays ? (
                              <Badge variant="outline">
                                {t('admin.plans_list.trial_days', { days: plan.trialDays })}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{plan.activeSubscriptions}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {plan.isActive ? (
                                <Badge variant="default" className="flex items-center gap-1">
                                  <Check className="h-3 w-3" />
                                  {t('admin.plans_list.status_active')}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <X className="h-3 w-3" />
                                  {t('admin.plans_list.status_inactive')}
                                </Badge>
                              )}
                              {plan.isVisible ? (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {t('admin.plans_list.status_visible')}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <EyeOff className="h-3 w-3" />
                                  {t('admin.plans_list.status_hidden')}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {plan.stripeProductId ? (
                              <Badge variant="default">{t('admin.plans_list.stripe_synced')}</Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSyncStripe(plan.id)}
                              >
                                {t('admin.plans_list.stripe_sync_button')}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Link href={`/admin/plans/${plan.id}`}>
                                <Button variant="ghost" size="sm">
                                  {t('admin.plans_list.view')}
                                </Button>
                              </Link>
                              <Link href={`/admin/plans/${plan.id}/edit`}>
                                <Button variant="outline" size="sm">
                                  {t('admin.plans_list.edit')}
                                </Button>
                              </Link>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(plan.id, planName)}
                              >
                                {t('admin.plans_list.delete')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </>
  )
}

export default PlansIndexPage
