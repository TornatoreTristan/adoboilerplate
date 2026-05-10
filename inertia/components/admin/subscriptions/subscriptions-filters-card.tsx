import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Filter, Search } from 'lucide-react'
import { useState } from 'react'
import { getTranslation } from '@/lib/translatable'
import { useI18n } from '@/hooks/use-i18n'
import type { Plan } from './types'

interface Filters {
  status: string
  planId: string
  search: string
}

interface Props {
  filters: Filters
  plans: Plan[]
  onStatusChange: (value: string) => void
  onPlanChange: (value: string) => void
  onSearchChange: (value: string) => void
}

export function SubscriptionsFiltersCard({
  filters,
  plans,
  onStatusChange,
  onPlanChange,
  onSearchChange,
}: Props) {
  const { t, locale } = useI18n()
  const [searchInput, setSearchInput] = useState(filters.search)

  const submitSearch = () => onSearchChange(searchInput)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <CardTitle>{t('admin.subscriptions.filters_title')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder={t('admin.subscriptions.search_placeholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
            />
            <Button onClick={submitSearch} variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <Select
            value={filters.status || 'all'}
            onValueChange={onStatusChange}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={t('admin.subscriptions.filter_status_placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.subscriptions.filter_status_all')}</SelectItem>
              <SelectItem value="active">{t('admin.subscriptions.status.active')}</SelectItem>
              <SelectItem value="trialing">{t('admin.subscriptions.status.trialing')}</SelectItem>
              <SelectItem value="paused">{t('admin.subscriptions.status.paused')}</SelectItem>
              <SelectItem value="canceled">{t('admin.subscriptions.status.canceled')}</SelectItem>
              <SelectItem value="past_due">{t('admin.subscriptions.status.past_due')}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.planId || 'all'}
            onValueChange={onPlanChange}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={t('admin.subscriptions.filter_plan_placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.subscriptions.filter_plan_all')}</SelectItem>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {getTranslation(plan.nameI18n, locale as 'fr' | 'en')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
