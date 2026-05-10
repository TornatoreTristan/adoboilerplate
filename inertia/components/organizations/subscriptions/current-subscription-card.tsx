import { Link } from '@adonisjs/inertia/react'
import { router } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { AlertCircle, ArrowUpCircle, Calendar, CreditCard } from 'lucide-react'
import { useState } from 'react'
import { formatDate } from '@/lib/utils'
import { getTranslation } from '@/lib/translatable'
import { useI18n } from '@/hooks/use-i18n'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import {
  SUBSCRIPTION_MANAGER_ROLES,
  SUBSCRIPTION_STATUS_COLORS,
  type CurrentSubscription,
} from './types'

interface Props {
  subscription: CurrentSubscription
  userRole: string
}

/**
 * Renders the active-subscription card: header with plan name + price,
 * billing-period info, the trial / canceled / past-due banners, and
 * the change-plan + cancel-with-confirm actions when the caller can
 * manage the subscription.
 */
export function CurrentSubscriptionCard({ subscription, userRole }: Props) {
  const { t } = useI18n()
  const formatPrice = useFormatCurrency()
  const canManage = SUBSCRIPTION_MANAGER_ROLES.has(userRole)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const statusLabel = (status: string) => {
    const known = ['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired']
    return known.includes(status)
      ? t(`organizations.subscriptions_settings.status.${status}`)
      : status
  }

  const handleCancel = () => {
    setIsProcessing(true)
    router.delete(`/organizations/subscriptions/${subscription.id}`, {
      preserveScroll: true,
      onFinish: () => {
        setIsProcessing(false)
        setIsCancelDialogOpen(false)
      },
    })
  }

  const handleReactivate = () => {
    setIsProcessing(true)
    router.post(
      `/organizations/subscriptions/${subscription.id}/reactivate`,
      {},
      {
        preserveScroll: true,
        onFinish: () => setIsProcessing(false),
      }
    )
  }

  const planName = getTranslation(subscription.plan.nameI18n!, locale as 'fr' | 'en')
  const planDescription = getTranslation(subscription.plan.descriptionI18n!, locale as 'fr' | 'en')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {planName}
              <Badge className={SUBSCRIPTION_STATUS_COLORS[subscription.status]}>
                {statusLabel(subscription.status)}
              </Badge>
            </CardTitle>
            <CardDescription>{planDescription}</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {formatPrice(
                subscription.billingInterval === 'month'
                  ? subscription.plan.priceMonthly
                  : subscription.plan.priceYearly,
                subscription.plan.currency.toUpperCase()
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {subscription.billingInterval === 'month'
                ? t('organizations.subscriptions_settings.per_month')
                : t('organizations.subscriptions_settings.per_year')}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {subscription.currentPeriodStart && subscription.currentPeriodEnd && (
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">
                  {t('organizations.subscriptions_settings.billing_period_title')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('organizations.subscriptions_settings.billing_period_value', {
                    start: formatDate(new Date(subscription.currentPeriodStart)),
                    end: formatDate(new Date(subscription.currentPeriodEnd)),
                  })}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">
                {t('organizations.subscriptions_settings.users_title')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('organizations.subscriptions_settings.users_count', {
                  count: subscription.userCount,
                })}
              </p>
            </div>
          </div>
        </div>

        {subscription.trialEndsAt && !subscription.canceledAt && (
          <div className="flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-950 p-3">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {t('organizations.subscriptions_settings.trial_until', {
                date: formatDate(new Date(subscription.trialEndsAt)),
              })}
            </p>
          </div>
        )}

        {subscription.canceledAt && subscription.status !== 'canceled' && (
          <div className="rounded-md bg-orange-50 dark:bg-orange-950 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  {t('organizations.subscriptions_settings.canceling_title')}
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  {subscription.currentPeriodEnd
                    ? t('organizations.subscriptions_settings.canceling_body_with_end', {
                        canceledAt: formatDate(new Date(subscription.canceledAt)),
                        endDate: formatDate(new Date(subscription.currentPeriodEnd)),
                      })
                    : t('organizations.subscriptions_settings.canceling_body_no_end', {
                        canceledAt: formatDate(new Date(subscription.canceledAt)),
                      })}
                </p>
              </div>
            </div>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReactivate}
                disabled={isProcessing}
                className="bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900"
              >
                {t('organizations.subscriptions_settings.reactivate_subscription')}
              </Button>
            )}
          </div>
        )}

        {subscription.status === 'canceled' && (
          <div className="flex items-start gap-3 rounded-md bg-red-50 dark:bg-red-950 p-4">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                {t('organizations.subscriptions_settings.canceled_title')}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {t('organizations.subscriptions_settings.canceled_body')}
              </p>
            </div>
          </div>
        )}

        {canManage &&
          ['active', 'trialing'].includes(subscription.status) &&
          !subscription.canceledAt && (
            <div className="flex gap-2 pt-4">
              <Button variant="outline" asChild>
                <Link href="/organizations/pricing">
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  {t('organizations.subscriptions_settings.change_plan')}
                </Link>
              </Button>
              <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    {t('organizations.subscriptions_settings.cancel_subscription')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t('organizations.subscriptions_settings.cancel_dialog_title')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {subscription.currentPeriodEnd
                        ? t(
                            'organizations.subscriptions_settings.cancel_dialog_description_with_end',
                            {
                              planName,
                              endDate: formatDate(new Date(subscription.currentPeriodEnd)),
                            }
                          )
                        : t(
                            'organizations.subscriptions_settings.cancel_dialog_description_no_end',
                            { planName }
                          )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isProcessing}>
                      {t('organizations.subscriptions_settings.cancel_dialog_keep')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancel}
                      disabled={isProcessing}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t('organizations.subscriptions_settings.cancel_dialog_confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
      </CardContent>
    </Card>
  )
}
