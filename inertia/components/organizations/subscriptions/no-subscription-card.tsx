import { Link } from '@adonisjs/inertia/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowUpCircle } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { SUBSCRIPTION_MANAGER_ROLES, type AvailablePlan } from './types'

interface Props {
  userRole: string
  availablePlans: AvailablePlan[]
}

export function NoSubscriptionCard({ userRole, availablePlans }: Props) {
  const { t } = useI18n()
  const canManage = SUBSCRIPTION_MANAGER_ROLES.has(userRole)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('common.no_active_subscription')}</CardTitle>
        <CardDescription>{t('common.choose_plan')}</CardDescription>
      </CardHeader>
      <CardContent>
        {canManage && availablePlans.length > 0 && (
          <Button asChild>
            <Link href="/organizations/pricing">
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              {t('organizations.subscriptions_settings.no_plans_action')}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
