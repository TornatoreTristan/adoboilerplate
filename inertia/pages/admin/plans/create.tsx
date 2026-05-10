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
import type { PlanFormData } from '@/components/admin/plans/types'

const initialFormData: PlanFormData = {
  name: '',
  slug: '',
  description: '',
  priceMonthly: 0,
  priceYearly: 0,
  currency: 'EUR',
  pricingModel: 'flat',
  pricingTiers: [{ minUsers: 1, maxUsers: null, price: 0 }],
  trialDays: 0,
  features: [''],
  limits: {},
  isActive: true,
  isVisible: true,
  sortOrder: 0,
  syncWithStripe: true,
}

export default function CreatePlanPage() {
  const { t } = useI18n()
  const { data, setData, post, processing, errors } = useForm<PlanFormData>(initialFormData)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/admin/plans')
  }

  return (
    <>
      <Head title={t('admin.plans_create.head_title')} />
      <AdminLayout
        breadcrumbs={[
          { label: t('admin.plans_form.breadcrumb_plans'), href: '/admin/plans' },
          { label: t('admin.plans_create.breadcrumb_create') },
        ]}
      >
        <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
          <PageHeader
            title={t('admin.plans_create.title')}
            description={t('admin.plans_create.description')}
            icon={CreditCard}
          />

          <form onSubmit={handleSubmit} className="space-y-6">
            <PlanGeneralCard data={data} setData={setData} errors={errors} autoSlug />
            <PlanPricingCard data={data} setData={setData} errors={errors} />
            <PlanTrialCard data={data} setData={setData} />
            <PlanFeaturesCard data={data} setData={setData} />
            <PlanOptionsCard data={data} setData={setData} showStripeSync />

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
                {processing ? t('admin.plans_create.submitting') : t('admin.plans_create.submit')}
              </Button>
            </div>
          </form>
        </div>
      </AdminLayout>
    </>
  )
}
