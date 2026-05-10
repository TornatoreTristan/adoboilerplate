import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Receipt, ExternalLink, Download } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import type { Invoice } from './types'

interface Props {
  invoices: Invoice[]
}

export function OrganizationInvoicesCard({ invoices }: Props) {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'en' ? 'en-US' : 'fr-FR'

  const formatPrice = (amount: number, currency: string) =>
    new Intl.NumberFormat(dateLocale, {
      style: 'currency',
      currency,
    }).format(amount)

  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString(dateLocale, { dateStyle: 'medium' })

  const renderStatusBadge = (status: string | null, paid: boolean) => {
    if (paid) {
      return (
        <Badge variant="default" className="bg-green-600">
          {t('admin.organization_detail.invoice_status.paid')}
        </Badge>
      )
    }
    if (status === 'open') {
      return <Badge variant="secondary">{t('admin.organization_detail.invoice_status.open')}</Badge>
    }
    if (status === 'void') {
      return <Badge variant="outline">{t('admin.organization_detail.invoice_status.void')}</Badge>
    }
    if (status === 'uncollectible') {
      return (
        <Badge variant="destructive">
          {t('admin.organization_detail.invoice_status.uncollectible')}
        </Badge>
      )
    }
    return <Badge variant="outline">{status}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <CardTitle>
            {t('admin.organization_detail.invoices_title', { count: invoices.length })}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {t('admin.organization_detail.empty_invoices_title')}
            </p>
            <p className="text-sm mt-2">
              {t('admin.organization_detail.empty_invoices_subtitle')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between border border-border/80 rounded-md p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {invoice.number ||
                        t('admin.organization_detail.invoice_default_number', {
                          id: invoice.id.substring(0, 8),
                        })}
                    </span>
                    {renderStatusBadge(invoice.status, invoice.paid)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {t('admin.organization_detail.invoice_created_label', {
                        date: formatDate(invoice.created),
                      })}
                    </span>
                    {invoice.periodStart && invoice.periodEnd && (
                      <span>
                        {t('admin.organization_detail.invoice_period_label', {
                          start: formatDate(invoice.periodStart),
                          end: formatDate(invoice.periodEnd),
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold text-lg">
                      {formatPrice(
                        invoice.paid ? invoice.amountPaid : invoice.amountDue,
                        invoice.currency
                      )}
                    </div>
                    {!invoice.paid && invoice.dueDate && (
                      <div className="text-xs text-muted-foreground">
                        {t('admin.organization_detail.invoice_due_label', {
                          date: formatDate(invoice.dueDate),
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {invoice.hostedInvoiceUrl && (
                      <a
                        href={invoice.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    {invoice.invoicePdf && (
                      <a href={invoice.invoicePdf} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
