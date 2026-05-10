import { router } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowRight,
  Building2,
  Check,
  Eye,
  MoreVertical,
  Pause,
  XCircle,
} from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'

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
  planId: string
  subscriptions: Subscription[]
  stripePriceIdMonthly: string | null
  stripePriceIdYearly: string | null
}

const confirmAndPost = (path: string, message: string) => {
  if (confirm(message)) router.post(path)
}

export function PlanSubscriptionsTable({
  planId,
  subscriptions,
  stripePriceIdMonthly,
  stripePriceIdYearly,
}: Props) {
  const { t, locale } = useI18n()

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

  return (
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
                <TableHead className="text-right">{t('admin.plan_show.col_actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((subscription) => {
                const expectedPriceId =
                  subscription.billingInterval === 'month'
                    ? stripePriceIdMonthly
                    : stripePriceIdYearly
                const isOutdated = subscription.stripePriceId !== expectedPriceId

                return (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-medium">{subscription.organizationName}</TableCell>
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
                              router.visit(`/admin/organizations/${subscription.organizationId}`)
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            {t('admin.plan_show.view_organization')}
                          </DropdownMenuItem>

                          {isOutdated &&
                            (subscription.status === 'active' ||
                              subscription.status === 'trialing') && (
                              <DropdownMenuItem
                                onClick={() =>
                                  confirmAndPost(
                                    `/admin/plans/${planId}/subscriptions/${subscription.id}/migrate`,
                                    t('admin.plan_show.confirm_migrate')
                                  )
                                }
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
                                onClick={() =>
                                  confirmAndPost(
                                    `/admin/subscriptions/${subscription.id}/pause`,
                                    t('admin.plan_show.confirm_pause')
                                  )
                                }
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                {t('admin.plan_show.pause')}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  confirmAndPost(
                                    `/admin/subscriptions/${subscription.id}/cancel`,
                                    t('admin.plan_show.confirm_cancel')
                                  )
                                }
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
                                onClick={() =>
                                  confirmAndPost(
                                    `/admin/subscriptions/${subscription.id}/resume`,
                                    t('admin.plan_show.confirm_resume')
                                  )
                                }
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
                                    confirmAndPost(
                                      `/admin/subscriptions/${subscription.id}/reactivate`,
                                      t('admin.plan_show.confirm_reactivate')
                                    )
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
  )
}
