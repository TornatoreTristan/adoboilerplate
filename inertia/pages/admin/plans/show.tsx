import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head, router } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  ArrowRight,
  Calendar,
  Users,
  DollarSign,
  Check,
  Building2,
  AlertCircle,
  MoreVertical,
  Eye,
  Pause,
  XCircle,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  description: string | null
  priceMonthly: number
  priceYearly: number
  currency: string
  trialDays: number | null
  features: string[] | null
  isActive: boolean
  isVisible: boolean
  stripePriceIdMonthly: string | null
  stripePriceIdYearly: string | null
  stripeProductId: string | null
}

interface Subscription {
  id: string
  organizationId: string
  organizationName: string
  status: string
  billingInterval: 'month' | 'year'
  stripePriceId: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  createdAt: string
}

interface Props {
  plan: Plan
  subscriptions: Subscription[]
}

const ShowPlanPage = ({ plan, subscriptions }: Props) => {
  const { t, locale } = useI18n()
  const planName = getTranslation(plan.nameI18n)
  const planDescription = plan.descriptionI18n
    ? getTranslation(plan.descriptionI18n)
    : plan.description

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
      style: 'currency',
      currency,
    }).format(price)

  const formatDate = (date: string | null) => {
    if (!date) return t('admin.plan_show.date_na')
    return new Date(date).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR')
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      trialing: 'secondary',
      past_due: 'destructive',
      canceled: 'outline',
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  const handleMigrateSubscription = (subscriptionId: string) => {
    if (confirm(t('admin.plan_show.confirm_migrate'))) {
      router.post(`/admin/plans/${plan.id}/subscriptions/${subscriptionId}/migrate`)
    }
  }

  const handleViewSubscription = (_subscriptionId: string, organizationId: string) => {
    router.visit(`/admin/organizations/${organizationId}`)
  }

  const handlePauseSubscription = (subscriptionId: string) => {
    if (confirm(t('admin.plan_show.confirm_pause'))) {
      router.post(`/admin/subscriptions/${subscriptionId}/pause`)
    }
  }

  const handleResumeSubscription = (subscriptionId: string) => {
    if (confirm(t('admin.plan_show.confirm_resume'))) {
      router.post(`/admin/subscriptions/${subscriptionId}/resume`)
    }
  }

  const handleCancelSubscription = (subscriptionId: string) => {
    if (confirm(t('admin.plan_show.confirm_cancel'))) {
      router.post(`/admin/subscriptions/${subscriptionId}/cancel`)
    }
  }

  const handleReactivateSubscription = (subscriptionId: string) => {
    if (confirm(t('admin.plan_show.confirm_reactivate'))) {
      router.post(`/admin/subscriptions/${subscriptionId}/reactivate`)
    }
  }

  const hasOutdatedSubscriptions = subscriptions.some((sub) => {
    const expectedPriceId =
      sub.billingInterval === 'month' ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly
    return sub.stripePriceId !== expectedPriceId
  })

  return (
    <>
      <Head title={t('admin.plan_show.head_title', { name: planName })} />
      <AdminLayout
        breadcrumbs={[
          { label: t('admin.plan_show.breadcrumb_plans'), href: '/admin/plans' },
          { label: planName },
        ]}
      >
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
          <PageHeader
            title={planName}
            description={
              planDescription || t('admin.plan_show.description_default', { name: planName })
            }
            icon={CreditCard}
            actions={
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.visit(`/admin/plans/${plan.id}/edit`)}
                >
                  {t('admin.plan_show.edit')}
                </Button>
                <Button onClick={() => router.visit('/admin/plans')}>
                  {t('admin.plan_show.back_to_list')}
                </Button>
              </div>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <CardTitle>{t('admin.plan_show.card_pricing')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold">
                      {formatPrice(plan.priceMonthly, plan.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('admin.plan_show.per_month')}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {formatPrice(plan.priceYearly, plan.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('admin.plan_show.per_year')}
                    </div>
                  </div>
                  {plan.trialDays && (
                    <Badge variant="secondary">
                      <Calendar className="mr-1 h-3 w-3" />
                      {t('admin.plan_show.trial_badge', { days: plan.trialDays })}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>{t('admin.plan_show.card_subscriptions')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{subscriptions.length}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('admin.plan_show.active_count', {
                      count: subscriptions.filter((s) => s.status === 'active').length,
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  <CardTitle>{t('admin.plan_show.card_status')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  {plan.isActive ? (
                    <Badge variant="default">{t('admin.plan_show.status_active')}</Badge>
                  ) : (
                    <Badge variant="outline">{t('admin.plan_show.status_inactive')}</Badge>
                  )}
                  {plan.isVisible ? (
                    <Badge variant="secondary">{t('admin.plan_show.status_visible')}</Badge>
                  ) : (
                    <Badge variant="outline">{t('admin.plan_show.status_hidden')}</Badge>
                  )}
                </div>
                {plan.stripeProductId && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      {t('admin.plan_show.stripe_id_monthly', {
                        id: plan.stripePriceIdMonthly?.substring(0, 15) ?? '',
                      })}
                    </div>
                    <div>
                      {t('admin.plan_show.stripe_id_yearly', {
                        id: plan.stripePriceIdYearly?.substring(0, 15) ?? '',
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {plan.features && plan.features.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.plan_show.card_features')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {hasOutdatedSubscriptions && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t('admin.plan_show.outdated_alert')}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>
                  {t('admin.plan_show.subscriptions_title', { count: subscriptions.length })}
                </CardTitle>
              </div>
              <CardDescription>{t('admin.plan_show.subscriptions_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('admin.plan_show.subscriptions_empty')}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.plan_show.col_organization')}</TableHead>
                      <TableHead>{t('admin.plan_show.col_status')}</TableHead>
                      <TableHead>{t('admin.plan_show.col_current_price')}</TableHead>
                      <TableHead>{t('admin.plan_show.col_period')}</TableHead>
                      <TableHead>{t('admin.plan_show.col_since')}</TableHead>
                      <TableHead className="text-right">
                        {t('admin.plan_show.col_actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((subscription) => {
                      const expectedPriceId =
                        subscription.billingInterval === 'month'
                          ? plan.stripePriceIdMonthly
                          : plan.stripePriceIdYearly
                      const isOutdated = subscription.stripePriceId !== expectedPriceId
                      return (
                        <TableRow key={subscription.id}>
                          <TableCell className="font-medium">
                            {subscription.organizationName}
                          </TableCell>
                          <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isOutdated ? (
                                <>
                                  <Badge variant="outline">
                                    {t('admin.plan_show.old_price_badge')}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {subscription.stripePriceId?.substring(0, 15)}...
                                  </span>
                                </>
                              ) : (
                                <Badge variant="default">
                                  {t('admin.plan_show.current_price_badge')}
                                </Badge>
                              )}
                              <Badge variant="secondary">
                                {subscription.billingInterval === 'month'
                                  ? t('admin.plan_show.type_monthly')
                                  : t('admin.plan_show.type_yearly')}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(subscription.currentPeriodStart)} →{' '}
                            {formatDate(subscription.currentPeriodEnd)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(subscription.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() =>
                                    handleViewSubscription(
                                      subscription.id,
                                      subscription.organizationId
                                    )
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  {t('admin.plan_show.view_organization')}
                                </DropdownMenuItem>

                                {isOutdated &&
                                  (subscription.status === 'active' ||
                                    subscription.status === 'trialing') && (
                                    <DropdownMenuItem
                                      onClick={() => handleMigrateSubscription(subscription.id)}
                                    >
                                      <ArrowRight className="mr-2 h-4 w-4" />
                                      {t('admin.plan_show.migrate_to_new_price')}
                                    </DropdownMenuItem>
                                  )}

                                {(subscription.status === 'active' ||
                                  subscription.status === 'trialing') && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handlePauseSubscription(subscription.id)}
                                    >
                                      <Pause className="mr-2 h-4 w-4" />
                                      {t('admin.plan_show.pause')}
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => handleCancelSubscription(subscription.id)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      {t('admin.plan_show.cancel')}
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {subscription.status === 'paused' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleResumeSubscription(subscription.id)}
                                    >
                                      <ArrowRight className="mr-2 h-4 w-4" />
                                      {t('admin.plan_show.resume')}
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {subscription.status === 'canceled' &&
                                  subscription.currentPeriodEnd && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleReactivateSubscription(subscription.id)
                                        }
                                      >
                                        <Check className="mr-2 h-4 w-4" />
                                        {t('admin.plan_show.reactivate')}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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

export default ShowPlanPage
