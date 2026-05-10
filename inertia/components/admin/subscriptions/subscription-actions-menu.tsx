import { router } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowRight, Check, Eye, MoreVertical, Pause, XCircle } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import type { Subscription } from './types'

interface Props {
  subscription: Subscription
  isOutdated: boolean
}

/**
 * The per-row actions dropdown. Action items light up based on the
 * subscription's current status (active/trialing/paused/canceled) and
 * whether the live Stripe price drifted from the plan's price ids.
 *
 * Every action goes through router.post() so Inertia handles the flash
 * + reload cycle for us — no local state to track here.
 */
export function SubscriptionActionsMenu({ subscription, isOutdated }: Props) {
  const { t } = useI18n()

  const post = (path: string, confirmKey: string) => {
    if (confirm(t(confirmKey))) {
      router.post(path)
    }
  }

  return (
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
          onClick={() => router.visit(`/admin/organizations/${subscription.organizationId}`)}
        >
          <Eye className="mr-2 h-4 w-4" />
          {t('admin.subscriptions.actions.view_organization')}
        </DropdownMenuItem>

        {isOutdated &&
          (subscription.status === 'active' || subscription.status === 'trialing') && (
            <DropdownMenuItem
              onClick={() =>
                post(
                  `/admin/plans/${subscription.planId}/subscriptions/${subscription.id}/migrate`,
                  'admin.subscriptions.confirm_migrate'
                )
              }
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              {t('admin.subscriptions.actions.migrate_to_new_price')}
            </DropdownMenuItem>
          )}

        {(subscription.status === 'active' || subscription.status === 'trialing') && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                post(
                  `/admin/subscriptions/${subscription.id}/pause`,
                  'admin.subscriptions.confirm_pause'
                )
              }
            >
              <Pause className="mr-2 h-4 w-4" />
              {t('admin.subscriptions.actions.pause')}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() =>
                post(
                  `/admin/subscriptions/${subscription.id}/cancel`,
                  'admin.subscriptions.confirm_cancel'
                )
              }
              className="text-destructive focus:text-destructive"
            >
              <XCircle className="mr-2 h-4 w-4" />
              {t('admin.subscriptions.actions.cancel')}
            </DropdownMenuItem>
          </>
        )}

        {subscription.status === 'paused' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                post(
                  `/admin/subscriptions/${subscription.id}/resume`,
                  'admin.subscriptions.confirm_resume'
                )
              }
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              {t('admin.subscriptions.actions.resume')}
            </DropdownMenuItem>
          </>
        )}

        {subscription.status === 'canceled' && subscription.currentPeriodEnd && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                post(
                  `/admin/subscriptions/${subscription.id}/reactivate`,
                  'admin.subscriptions.confirm_reactivate'
                )
              }
            >
              <Check className="mr-2 h-4 w-4" />
              {t('admin.subscriptions.actions.reactivate')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
