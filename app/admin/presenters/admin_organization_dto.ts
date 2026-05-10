export interface AdminInvoiceDto {
  id: string
  number: string | null
  status: string
  amountPaid: number
  amountDue: number
  currency: string
  created: number
  dueDate: number | null
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
  paid: boolean
  periodStart: number
  periodEnd: number
}

export class AdminOrganizationDtoPresenter {
  static presentInvoice(invoice: {
    id: string
    number: string | null | undefined
    status: string | null | undefined
    amount_paid: number
    amount_due: number
    currency: string
    created: number
    due_date: number | null | undefined
    hosted_invoice_url?: string | null
    invoice_pdf?: string | null
    paid?: boolean
    period_start: number
    period_end: number
  }): AdminInvoiceDto {
    const status = invoice.status ?? ''
    return {
      id: invoice.id,
      number: invoice.number ?? null,
      status,
      amountPaid: invoice.amount_paid / 100,
      amountDue: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      created: invoice.created,
      dueDate: invoice.due_date ?? null,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdf: invoice.invoice_pdf ?? null,
      paid: invoice.paid ?? status === 'paid',
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end,
    }
  }
}
