import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Receipt } from 'lucide-react'
import { getTranslation } from '@/lib/translatable'
import { useI18n } from '@/hooks/use-i18n'
import { useFormatDate } from '@/hooks/use-format-date'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { SubscriptionActionsMenu } from './subscription-actions-menu'
import type { Subscription } from './types'

interface Props {
  subscriptions: Subscription[]
}

const monthsBetween = (start: Date, end: Date) =>
  Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44))

const yearsBetween = (start: Date, end: Date) =>
  Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25))

/**
 * Estimated revenue since the subscription was created. We can't ask
 * Stripe for this number cheaply (would require iterating invoices for
 * every row), so it's a back-of-envelope: number-of-billing-cycles since
 * createdAt × current price. The +1 in each branch accounts for the
 * initial payment that happens at sign-up before any cycle elapses.
 *
 * Trialing subscriptions return 0 — Stripe hasn't charged anything yet.
 */
const estimateTotalRevenue = (subscription: Subscription): number => {
  if (subscription.status === 'trialing') return 0
  const created = new Date(subscription.createdAt)
  const now = new Date()
  const cycles =
    subscription.billingInterval === 'month'
      ? monthsBetween(created, now) + 1
      : yearsBetween(created, now) + 1
  return subscription.subscriptionPrice * cycles
}

export function SubscriptionsTable({ subscriptions }: Props) {
  const { t, locale } = useI18n()
  const formatDateValue = useFormatDate()
  const formatCurrency = useFormatCurrency()

  const formatDate = (date: string | null) => {
    if (!date) return t('admin.subscriptions.date_na')
    return formatDateValue(date, 'short')
  }

  const getTimeSinceCreation = (createdAt: string) => {
    const months = monthsBetween(new Date(createdAt), new Date())
    if (months === 0) return t('admin.subscriptions.duration_less_than_month')
    if (months === 1) return t('admin.subscriptions.duration_one_month')
    return t('admin.subscriptions.duration_months', { count: months })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      trialing: 'secondary',
      paused: 'outline',
      canceled: 'destructive',
      past_due: 'destructive',
    }
    const variant = variants[status] ?? 'outline'
    const label = variants[status] ? t(`admin.subscriptions.status.${status}`) : status
    return <Badge variant={variant}>{label}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('admin.subscriptions.list_title', { count: subscriptions.length })}
        </CardTitle>
        <CardDescription>{t('admin.subscriptions.list_description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {subscriptions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">{t('admin.subscriptions.empty_title')}</p>
            <p className="text-sm mt-2">{t('admin.subscriptions.empty_subtitle')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.subscriptions.col.organization')}</TableHead>
                <TableHead>{t('admin.subscriptions.col.plan')}</TableHead>
                <TableHead>{t('admin.subscriptions.col.type')}</TableHead>
                <TableHead>{t('admin.subscriptions.col.price')}</TableHead>
                <TableHead>{t('admin.subscriptions.col.status')}</TableHead>
                <TableHead>{t('admin.subscriptions.col.total_revenue')}</TableHead>
                <TableHead>{t('admin.subscriptions.col.period')}</TableHead>
                <TableHead>{t('admin.subscriptions.col.since')}</TableHead>
                <TableHead className="text-right">
                  {t('admin.subscriptions.col.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((subscription) => {
                const expectedPriceId =
                  subscription.billingInterval === 'month'
                    ? subscription.stripePriceIdMonthly
                    : subscription.stripePriceIdYearly
                const isOutdated = subscription.stripePriceId !== expectedPriceId
                const planPrice =
                  subscription.billingInterval === 'month'
                    ? subscription.priceMonthly
                    : subscription.priceYearly
                const totalRevenue = estimateTotalRevenue(subscription)

                return (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-medium">{subscription.organizationName}</TableCell>
                    <TableCell>
                      {getTranslation(subscription.planNameI18n, locale as 'fr' | 'en')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="w-fit">
                        {subscription.billingInterval === 'month'
                          ? t('admin.subscriptions.type_monthly')
                          : t('admin.subscriptions.type_yearly')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {formatCurrency(
                            subscription.subscriptionPrice,
                            subscription.subscriptionCurrency
                          )}
                        </span>
                        {isOutdated && (
                          <Badge variant="outline" className="w-fit text-orange-600 text-xs">
                            {t('admin.subscriptions.new_price_label', {
                              price: formatCurrency(planPrice, subscription.planCurrency),
                            })}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(totalRevenue, subscription.subscriptionCurrency)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(subscription.currentPeriodStart)} →{' '}
                      {formatDate(subscription.currentPeriodEnd)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getTimeSinceCreation(subscription.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <SubscriptionActionsMenu
                        subscription={subscription}
                        isOutdated={isOutdated}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
