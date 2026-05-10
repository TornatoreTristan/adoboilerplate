import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Check, DollarSign, Users } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'

interface PlanSummary {
  priceMonthly: number
  priceYearly: number
  currency: string
  trialDays: number | null
  isActive: boolean
  isVisible: boolean
  stripeProductId: string | null
  stripePriceIdMonthly: string | null
  stripePriceIdYearly: string | null
}

interface SubscriptionSummary {
  status: string
}

interface Props {
  plan: PlanSummary
  subscriptions: SubscriptionSummary[]
}

/**
 * The 3 small status cards that sit above the features + table on
 * the plan-show page (pricing / subscriptions count / status).
 */
export function PlanSummaryCards({ plan, subscriptions }: Props) {
  const { t, locale } = useI18n()
  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
      style: 'currency',
      currency,
    }).format(price)

  return (
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
              <div className="text-xs text-muted-foreground">{t('admin.plan_show.per_month')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {formatPrice(plan.priceYearly, plan.currency)}
              </div>
              <div className="text-xs text-muted-foreground">{t('admin.plan_show.per_year')}</div>
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
  )
}
