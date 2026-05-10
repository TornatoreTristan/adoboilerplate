import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head, Link, useForm, usePage } from '@inertiajs/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Building2,
  Users,
  Globe,
  Shield,
  UserCog,
  Plus,
  Receipt,
  Download,
  ExternalLink,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Separator } from '#inertia/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'

interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  website: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Member {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  role: string
  joinedAt: string
}

interface Invoice {
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

interface OrganizationDetailPageProps {
  organization: Organization
  members: Member[]
  invoices: Invoice[]
}

const getRoleIcon = (role: string) => {
  if (role === 'admin' || role === 'owner') return <Shield className="h-4 w-4" />
  if (role === 'moderator') return <UserCog className="h-4 w-4" />
  return <Users className="h-4 w-4" />
}

const OrganizationDetailPage = ({ organization, members, invoices }: OrganizationDetailPageProps) => {
  const { t, locale } = useI18n()
  const adminCount = members.filter((m) => m.role === 'admin' || m.role === 'owner').length
  const [open, setOpen] = useState(false)
  const { flash } = usePage<any>().props
  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
    role: 'member',
  })

  const dateLocale = locale === 'en' ? 'en-US' : 'fr-FR'

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat(dateLocale, {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(dateLocale, {
      dateStyle: 'medium',
    })
  }

  const formatDateTime = (iso: string) => {
    return new Intl.DateTimeFormat(dateLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  }

  const formatDateOnly = (iso: string) => {
    return new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium' }).format(new Date(iso))
  }

  const renderRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      owner: 'default',
      admin: 'default',
      moderator: 'secondary',
      member: 'outline',
    }
    const variant = variants[role] ?? 'outline'
    const label = variants[role] ? t(`admin.organization_detail.role.${role}`) : role
    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        {getRoleIcon(role)}
        {label}
      </Badge>
    )
  }

  const renderInvoiceStatusBadge = (status: string | null, paid: boolean) => {
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

  const totalRevenue = invoices.filter((inv) => inv.paid).reduce((sum, inv) => sum + inv.amountPaid, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(`/admin/organizations/${organization.id}/members`, {
      onSuccess: () => {
        setOpen(false)
        reset()
        if (flash.success) {
          toast.success(flash.success)
        }
      },
      onError: () => {
        if (errors.email) {
          toast.error(errors.email)
        }
      },
    })
  }

  return (
    <>
      <Head title={t('admin.organization_detail.head_title', { name: organization.name })} />
      <AdminLayout
        breadcrumbs={[
          { label: t('admin.organization_detail.breadcrumb_organizations'), href: '/admin/organizations' },
          { label: organization.name },
        ]}
      >
        <div className="flex flex-col gap-6 p-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/organizations">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <PageHeader
                title={organization.name}
                description={`/${organization.slug}`}
                separator={false}
              />
            </div>
          </div>
          <Separator />

          <div className="grid gap-6 md:grid-cols-2">
            {/* Informations générales */}
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.organization_detail.general_info_title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('admin.organization_detail.field_id')}</span>
                    <span className="font-mono text-xs">{organization.id}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('admin.organization_detail.field_slug')}</span>
                    <span className="font-mono">/{organization.slug}</span>
                  </div>

                  {organization.description && (
                    <div className="flex flex-col gap-2 text-sm">
                      <span className="text-muted-foreground">{t('admin.organization_detail.field_description')}</span>
                      <p className="text-sm">{organization.description}</p>
                    </div>
                  )}

                  {organization.website && (
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">{t('admin.organization_detail.field_website')}</span>
                      <a
                        href={organization.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <Globe className="h-3 w-3" />
                        <span className="text-xs">{organization.website}</span>
                      </a>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('admin.organization_detail.field_status')}</span>
                    {organization.isActive ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{t('admin.organization_detail.status_active')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-orange-600">
                        <XCircle className="h-4 w-4" />
                        <span>{t('admin.organization_detail.status_inactive')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('admin.organization_detail.field_created_at')}</span>
                    <span>{formatDateTime(organization.createdAt)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('admin.organization_detail.field_updated_at')}</span>
                    <span>{formatDateTime(organization.updatedAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistiques */}
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.organization_detail.statistics_title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('admin.organization_detail.stats_total_members')}
                  </span>
                  <span className="font-semibold">{members.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('admin.organization_detail.stats_admins')}</span>
                  <span className="font-semibold">{adminCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('admin.organization_detail.stats_total_invoices')}
                  </span>
                  <span className="font-semibold">{invoices.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('admin.organization_detail.stats_total_revenue')}
                  </span>
                  <span className="font-semibold text-green-600">
                    {invoices.length > 0 ? formatPrice(totalRevenue, invoices[0].currency) : '0 €'}
                  </span>
                </div>
                {members.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t('admin.organization_detail.stats_last_member_added')}
                    </span>
                    <span className="text-sm">
                      {t('admin.organization_detail.stats_time_ago', {
                        time: formatDistanceToNow(new Date(members[members.length - 1].joinedAt), {
                          locale: fr,
                        }),
                      })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Membres */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {t('admin.organization_detail.members_title', { count: members.length })}
              </CardTitle>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('admin.organization_detail.add_member_button')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle>{t('admin.organization_detail.add_member_dialog_title')}</DialogTitle>
                      <DialogDescription>
                        {t('admin.organization_detail.add_member_dialog_description')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="email">{t('admin.organization_detail.email_label')}</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder={t('admin.organization_detail.email_placeholder')}
                          value={data.email}
                          onChange={(e) => setData('email', e.target.value)}
                          required
                        />
                        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="role">{t('admin.organization_detail.role_label')}</Label>
                        <Select value={data.role} onValueChange={(value) => setData('role', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('admin.organization_detail.role_placeholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">{t('admin.organization_detail.role.owner')}</SelectItem>
                            <SelectItem value="admin">{t('admin.organization_detail.role.admin')}</SelectItem>
                            <SelectItem value="moderator">{t('admin.organization_detail.role.moderator')}</SelectItem>
                            <SelectItem value="member">{t('admin.organization_detail.role.member')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button type="submit" disabled={processing}>
                        {t('admin.organization_detail.submit_add_member')}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('admin.organization_detail.empty_members')}
                </p>
              ) : (
                <div className="space-y-4">
                  {members.map((member) => (
                    <Link
                      key={member.id}
                      href={`/admin/users/${member.id}`}
                      className="flex items-start justify-between border border-border/80 rounded-md p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatarUrl || ''} alt={member.fullName || ''} />
                          <AvatarFallback>
                            {member.fullName
                              ? member.fullName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()
                              : member.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {member.fullName || t('admin.organization_detail.member_no_name')}
                            </span>
                            {renderRoleBadge(member.role)}
                          </div>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('admin.organization_detail.member_since', { date: formatDateOnly(member.joinedAt) })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Factures et paiements */}
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
                  <p className="text-lg font-medium">{t('admin.organization_detail.empty_invoices_title')}</p>
                  <p className="text-sm mt-2">{t('admin.organization_detail.empty_invoices_subtitle')}</p>
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
                              t('admin.organization_detail.invoice_default_number', { id: invoice.id.substring(0, 8) })}
                          </span>
                          {renderInvoiceStatusBadge(invoice.status, invoice.paid)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {t('admin.organization_detail.invoice_created_label', { date: formatDate(invoice.created) })}
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
                            {formatPrice(invoice.paid ? invoice.amountPaid : invoice.amountDue, invoice.currency)}
                          </div>
                          {!invoice.paid && invoice.dueDate && (
                            <div className="text-xs text-muted-foreground">
                              {t('admin.organization_detail.invoice_due_label', { date: formatDate(invoice.dueDate) })}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {invoice.hostedInvoiceUrl && (
                            <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
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
        </div>
      </AdminLayout>
    </>
  )
}

export default OrganizationDetailPage
