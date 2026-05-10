import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/hooks/use-i18n'
import type { EmailLogsStats } from './types'

interface Props {
  status: string
  category: string
  search: string
  categories: EmailLogsStats['byCategory']
  onChange: (next: { status: string; category: string; search: string }) => void
}

export function MailsFiltersBar({ status, category, search, categories, onChange }: Props) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex-1">
        <Input
          placeholder={t('admin.mails.search_placeholder')}
          value={search}
          onChange={(e) => onChange({ status, category, search: e.target.value })}
          className="max-w-sm"
        />
      </div>

      <Select
        value={status}
        onValueChange={(value) => onChange({ status: value, category, search })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('admin.mails.filter_status_placeholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('admin.mails.filter_status_all')}</SelectItem>
          <SelectItem value="sent">{t('admin.mails.status.sent')}</SelectItem>
          <SelectItem value="delivered">{t('admin.mails.status.delivered')}</SelectItem>
          <SelectItem value="failed">{t('admin.mails.status.failed')}</SelectItem>
          <SelectItem value="pending">{t('admin.mails.status.pending')}</SelectItem>
          <SelectItem value="opened">{t('admin.mails.status.opened')}</SelectItem>
          <SelectItem value="clicked">{t('admin.mails.status.clicked')}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={category}
        onValueChange={(value) => onChange({ status, category: value, search })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('admin.mails.filter_category_placeholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('admin.mails.filter_category_all')}</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.category} value={cat.category}>
              {cat.category} ({cat.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
