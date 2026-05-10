import { StatTile } from '@/components/core/stat-tile'
import { useI18n } from '@/hooks/use-i18n'
import type { Stats } from './types'

interface Props {
  stats: Stats
}

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
        <StatTile key={item.key} title={t(item.labelKey)} value={stats[item.key]} />
      ))}
    </div>
  )
}
