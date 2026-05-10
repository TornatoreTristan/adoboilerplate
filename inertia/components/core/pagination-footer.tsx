import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/use-i18n'

interface Props {
  page: number
  perPage: number
  total: number
  onPageChange: (page: number) => void
  rangeLabelKey?: string
  previousLabelKey?: string
  nextLabelKey?: string
}

/**
 * "Showing X to Y of Z" + Previous/Next buttons. Defaults to the
 * `admin.logs.*` keys but any consumer can pass their own translation
 * keys.
 */
export function PaginationFooter({
  page,
  perPage,
  total,
  onPageChange,
  rangeLabelKey = 'admin.logs.showing_range',
  previousLabelKey = 'admin.logs.previous',
  nextLabelKey = 'admin.logs.next',
}: Props) {
  const { t } = useI18n()
  const from = total === 0 ? 0 : Math.min((page - 1) * perPage + 1, total)
  const to = Math.min(page * perPage, total)

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        {t(rangeLabelKey, { from, to, total })}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          {t(previousLabelKey)}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page * perPage >= total}
        >
          {t(nextLabelKey)}
        </Button>
      </div>
    </div>
  )
}
