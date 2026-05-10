import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head, router } from '@inertiajs/react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, CreditCard } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import {
  getTranslation,
  type TranslatableField,
  type TranslatableFieldNullable,
} from '@/lib/translatable'
import { PlanSummaryCards } from '@/components/admin/plans/plan-summary-cards'
import { PlanFeaturesList } from '@/components/admin/plans/plan-features-list'
import { PlanSubscriptionsTable } from '@/components/admin/plans/plan-subscriptions-table'

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

export default function ShowPlanPage({ plan, subscriptions }: Props) {
  const { t } = useI18n()
  const planName = getTranslation(plan.nameI18n)
  const planDescription = plan.descriptionI18n
    ? getTranslation(plan.descriptionI18n)
    : plan.description

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

          <PlanSummaryCards plan={plan} subscriptions={subscriptions} />

          {plan.features && plan.features.length > 0 && (
            <PlanFeaturesList features={plan.features} />
          )}

          {hasOutdatedSubscriptions && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t('admin.plan_show.outdated_alert')}</AlertDescription>
            </Alert>
          )}

          <PlanSubscriptionsTable
            planId={plan.id}
            subscriptions={subscriptions}
            stripePriceIdMonthly={plan.stripePriceIdMonthly}
            stripePriceIdYearly={plan.stripePriceIdYearly}
          />
        </div>
      </AdminLayout>
    </>
  )
}
