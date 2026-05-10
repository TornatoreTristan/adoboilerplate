export interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  website: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Member {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  role: string
  joinedAt: string
}

export interface Invoice {
  id: string
  number: string | null
  status: string | null
  amountPaid: number
  amountDue: number
  currency: string
  created: number
  dueDate: number | null
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
  paid: boolean
  periodStart: number | null
  periodEnd: number | null
}
