import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KeyValueRow } from '@/components/core/key-value-row'
import { useI18n } from '@/hooks/use-i18n'
import { useRelativeDate } from '@/hooks/use-relative-date'
import type { Member, Invoice } from './types'

interface Props {
  members: Member[]
  invoices: Invoice[]
}

export function OrganizationStatsCard({ members, invoices }: Props) {
  const { t, locale } = useI18n()
  const formatRelative = useRelativeDate()
  const intlLocale = locale === 'en' ? 'en-US' : 'fr-FR'

  const adminCount = members.filter((m) => m.role === 'admin' || m.role === 'owner').length
  const totalRevenue = invoices
    .filter((inv) => inv.paid)
    .reduce((sum, inv) => sum + inv.amountPaid, 0)

  const formatPrice = (amount: number, currency: string) =>
    new Intl.NumberFormat(intlLocale, { style: 'currency', currency }).format(amount)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.organization_detail.statistics_title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <KeyValueRow
          label={t('admin.organization_detail.stats_total_members')}
          value={members.length}
          valueClassName="font-semibold"
        />
        <KeyValueRow
          label={t('admin.organization_detail.stats_admins')}
          value={adminCount}
          valueClassName="font-semibold"
        />
        <KeyValueRow
          label={t('admin.organization_detail.stats_total_invoices')}
          value={invoices.length}
          valueClassName="font-semibold"
        />
        <KeyValueRow
          label={t('admin.organization_detail.stats_total_revenue')}
          value={invoices.length > 0 ? formatPrice(totalRevenue, invoices[0].currency) : '0 €'}
          valueClassName="font-semibold text-green-600"
        />
        {members.length > 0 && (
          <KeyValueRow
            label={t('admin.organization_detail.stats_last_member_added')}
            value={t('admin.organization_detail.stats_time_ago', {
              time: formatRelative(members[members.length - 1].joinedAt, { addSuffix: false }),
            })}
          />
        )}
      </CardContent>
    </Card>
  )
}
