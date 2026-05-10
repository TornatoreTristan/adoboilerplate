import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useI18n } from '@/hooks/use-i18n'
import type { Member, Invoice } from './types'

interface Props {
  members: Member[]
  invoices: Invoice[]
}

export function OrganizationStatsCard({ members, invoices }: Props) {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'en' ? 'en-US' : 'fr-FR'
  const dateFnsLocale = locale === 'en' ? enUS : fr

  const adminCount = members.filter((m) => m.role === 'admin' || m.role === 'owner').length
  const totalRevenue = invoices
    .filter((inv) => inv.paid)
    .reduce((sum, inv) => sum + inv.amountPaid, 0)

  const formatPrice = (amount: number, currency: string) =>
    new Intl.NumberFormat(dateLocale, {
      style: 'currency',
      currency,
    }).format(amount)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.organization_detail.statistics_title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">
            {t('admin.organization_detail.stats_total_members')}
          </span>
          <span className="font-semibold">{members.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">
            {t('admin.organization_detail.stats_admins')}
          </span>
          <span className="font-semibold">{adminCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">
            {t('admin.organization_detail.stats_total_invoices')}
          </span>
          <span className="font-semibold">{invoices.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">
            {t('admin.organization_detail.stats_total_revenue')}
          </span>
          <span className="font-semibold text-green-600">
            {invoices.length > 0 ? formatPrice(totalRevenue, invoices[0].currency) : '0 €'}
          </span>
        </div>
        {members.length > 0 && (
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              {t('admin.organization_detail.stats_last_member_added')}
            </span>
            <span className="text-sm">
              {t('admin.organization_detail.stats_time_ago', {
                time: formatDistanceToNow(new Date(members[members.length - 1].joinedAt), {
                  locale: dateFnsLocale,
                }),
              })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
