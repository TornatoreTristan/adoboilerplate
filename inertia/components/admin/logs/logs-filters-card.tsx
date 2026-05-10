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
import { RefreshCw } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import type { LogFilters } from './types'

interface Props {
  filters: LogFilters
  onChange: (filters: LogFilters) => void
  onRefresh: () => void
}

export function LogsFiltersCard({ filters, onChange, onRefresh }: Props) {
  const { t } = useI18n()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.logs.filters_title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder={t('admin.logs.search_placeholder')}
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              className="w-full"
            />
          </div>

          <Select
            value={filters.level}
            onValueChange={(value) => onChange({ ...filters, level: value })}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t('admin.logs.filter_level_placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.logs.filter_level_all')}</SelectItem>
              <SelectItem value="debug">{t('admin.logs.level.debug')}</SelectItem>
              <SelectItem value="info">{t('admin.logs.level.info')}</SelectItem>
              <SelectItem value="warn">{t('admin.logs.level.warn')}</SelectItem>
              <SelectItem value="error">{t('admin.logs.level.error')}</SelectItem>
              <SelectItem value="fatal">{t('admin.logs.level.fatal')}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.method}
            onValueChange={(value) => onChange({ ...filters, method: value })}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t('admin.logs.filter_method_placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.logs.filter_method_all')}</SelectItem>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
