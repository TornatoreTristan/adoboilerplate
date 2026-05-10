import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { useI18n } from '@/hooks/use-i18n'
import type { Stats } from './types'

interface Props {
  stats: Stats
}

/**
 * Six mini-cards on the dashboard. Pulled out of the main page so each
 * card can be re-rendered independently when its specific stat changes.
 */
export function SubscriptionsStatsRow({ stats }: Props) {
  const { t } = useI18n()
  const items: Array<{ key: keyof Stats; labelKey: string }> = [
    { key: 'total', labelKey: 'admin.subscriptions.stats.total' },
    { key: 'active', labelKey: 'admin.subscriptions.stats.active' },
    { key: 'trialing', labelKey: 'admin.subscriptions.stats.trialing' },
    { key: 'paused', labelKey: 'admin.subscriptions.stats.paused' },
    { key: 'canceled', labelKey: 'admin.subscriptions.stats.canceled' },
    { key: 'pastDue', labelKey: 'admin.subscriptions.stats.past_due' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
      {items.map((item) => (
        <Card key={item.key}>
          <CardHeader className="pb-2">
            <CardDescription>{t(item.labelKey)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats[item.key]}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
