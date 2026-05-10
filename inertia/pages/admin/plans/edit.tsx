import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { useI18n } from '@/hooks/use-i18n'
import { Head, router, useForm } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { CreditCard } from 'lucide-react'
import { PlanGeneralCard } from '@/components/admin/plans/plan-general-card'
import { PlanPricingCard } from '@/components/admin/plans/plan-pricing-card'
import { PlanTrialCard } from '@/components/admin/plans/plan-trial-card'
import { PlanFeaturesCard } from '@/components/admin/plans/plan-features-card'
import { PlanOptionsCard } from '@/components/admin/plans/plan-options-card'
import type { PlanFormData, PricingModel, PricingTier } from '@/components/admin/plans/types'

interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  priceMonthly: number
  priceYearly: number
  currency: string
  pricingModel: PricingModel
  pricingTiers: PricingTier[] | null
  trialDays: number | null
  features: string[] | null
  limits: Record<string, unknown> | null
  isActive: boolean
  isVisible: boolean
  sortOrder: number
  stripeProductId: string | null
  stripePriceIdMonthly: string | null
  stripePriceIdYearly: string | null
}

interface Props {
  plan: Plan
}

export default function EditPlanPage({ plan }: Props) {
  const { t } = useI18n()

  const initialFormData: PlanFormData = {
    name: plan.name,
    slug: plan.slug,
    description: plan.description || '',
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    currency: plan.currency,
    pricingModel: plan.pricingModel,
    pricingTiers: plan.pricingTiers || [{ minUsers: 1, maxUsers: null, price: 0 }],
    trialDays: plan.trialDays || 0,
    features: plan.features || [''],
    limits: plan.limits || {},
    isActive: plan.isActive,
    isVisible: plan.isVisible,
    sortOrder: plan.sortOrder,
  }

  const { data, setData, put, processing, errors } = useForm<PlanFormData>(initialFormData)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    put(`/admin/plans/${plan.id}`)
  }

  return (
    <>
      <Head title={t('admin.plans_edit.head_title', { name: plan.name })} />
      <AdminLayout
        breadcrumbs={[
          { label: t('admin.plans_form.breadcrumb_plans'), href: '/admin/plans' },
          { label: plan.name, href: `/admin/plans/${plan.id}` },
          { label: t('admin.plans_edit.breadcrumb_edit') },
        ]}
      >
        <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
          <PageHeader
            title={t('admin.plans_edit.title', { name: plan.name })}
            description={t('admin.plans_edit.description')}
            icon={CreditCard}
          />

          <form onSubmit={handleSubmit} className="space-y-6">
            <PlanGeneralCard data={data} setData={setData} errors={errors} slugLocked />
            <PlanPricingCard data={data} setData={setData} errors={errors} pricingModelLocked />
            <PlanTrialCard data={data} setData={setData} />
            <PlanFeaturesCard data={data} setData={setData} />
            <PlanOptionsCard
              data={data}
              setData={setData}
              description={t('admin.plans_edit.section_options_description_short')}
            />

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.visit('/admin/plans')}
                disabled={processing}
              >
                {t('admin.plans_form.cancel')}
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? t('admin.plans_edit.submitting') : t('admin.plans_edit.submit')}
              </Button>
            </div>
          </form>
        </div>
      </AdminLayout>
    </>
  )
}
