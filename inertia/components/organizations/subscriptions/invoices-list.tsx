import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, ExternalLink, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useI18n } from '@/hooks/use-i18n'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { INVOICE_STATUS_COLORS, type Invoice } from './types'

interface Props {
  invoices: Invoice[]
}

export function InvoicesList({ invoices }: Props) {
  const { t } = useI18n()
  const formatCurrency = useFormatCurrency()

  const statusLabel = (status: string) => {
    const known = ['paid', 'open', 'void', 'uncollectible', 'draft']
    return known.includes(status)
      ? t(`organizations.subscriptions_settings.invoice_status.${status}`)
      : status
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        <h3 className="text-lg font-semibold">
          {t('organizations.subscriptions_settings.invoices_title')}
        </h3>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {invoice.number ||
                          t('organizations.subscriptions_settings.invoice_default_number', {
                            id: invoice.id.substring(0, 8),
                          })}
                      </p>
                      {invoice.status && (
                        <Badge className={INVOICE_STATUS_COLORS[invoice.status] || 'bg-gray-500'}>
                          {statusLabel(invoice.status)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(new Date(invoice.created * 1000))}
                      {invoice.dueDate && invoice.status !== 'paid' && (
                        <>
                          {' '}
                          •{' '}
                          {t('organizations.subscriptions_settings.invoice_due_label', {
                            date: formatDate(new Date(invoice.dueDate * 1000)),
                          })}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(invoice.amountDue / 100, invoice.currency.toUpperCase())}
                    </p>
                    {invoice.status === 'paid' && invoice.amountPaid > 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {t('organizations.subscriptions_settings.invoice_paid_label')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {invoice.hostedInvoiceUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {invoice.invoicePdf && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={invoice.invoicePdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
