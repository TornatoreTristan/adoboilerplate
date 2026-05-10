import { Head } from '@inertiajs/react'
import OrganizationSettingsLayout from '@/components/layouts/organization-settings-layout'
import { useI18n } from '@/hooks/use-i18n'
import { CurrentSubscriptionCard } from '@/components/organizations/subscriptions/current-subscription-card'
import { NoSubscriptionCard } from '@/components/organizations/subscriptions/no-subscription-card'
import { InvoicesList } from '@/components/organizations/subscriptions/invoices-list'
import type {
  AvailablePlan,
  CurrentSubscription,
  Invoice,
} from '@/components/organizations/subscriptions/types'

interface Props {
  organization: { id: string; name: string }
  userRole: string
  currentSubscription: CurrentSubscription | null
  availablePlans: AvailablePlan[]
  invoices: Invoice[]
}

export default function OrganizationSettingsSubscriptionsPage({
  userRole,
  currentSubscription,
  availablePlans,
  invoices,
}: Props) {
  const { t } = useI18n()

  return (
    <>
      <Head title={t('organizations.subscriptions_settings.head_title')} />
      <OrganizationSettingsLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">{t('common.subscription_management')}</h2>
            <p className="text-sm text-muted-foreground">{t('common.manage_subscription')}</p>
          </div>

          {currentSubscription ? (
            <CurrentSubscriptionCard subscription={currentSubscription} userRole={userRole} />
          ) : (
            <NoSubscriptionCard userRole={userRole} availablePlans={availablePlans} />
          )}

          {invoices.length > 0 && <InvoicesList invoices={invoices} />}
        </div>
      </OrganizationSettingsLayout>
    </>
  )
}
