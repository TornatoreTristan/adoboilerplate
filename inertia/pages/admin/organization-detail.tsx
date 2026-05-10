import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Link } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Building2 } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { OrganizationInfoCard } from '@/components/admin/organizations/organization-info-card'
import { OrganizationStatsCard } from '@/components/admin/organizations/organization-stats-card'
import { OrganizationMembersCard } from '@/components/admin/organizations/organization-members-card'
import { OrganizationInvoicesCard } from '@/components/admin/organizations/organization-invoices-card'
import type {
  Invoice,
  Member,
  Organization,
} from '@/components/admin/organizations/types'

interface Props {
  organization: Organization
  members: Member[]
  invoices: Invoice[]
}

export default function OrganizationDetailPage({ organization, members, invoices }: Props) {
  const { t } = useI18n()

  return (
    <>
      <Head title={t('admin.organization_detail.head_title', { name: organization.name })} />
      <AdminLayout
        breadcrumbs={[
          {
            label: t('admin.organization_detail.breadcrumb_organizations'),
            href: '/admin/organizations',
          },
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
            <OrganizationInfoCard organization={organization} />
            <OrganizationStatsCard members={members} invoices={invoices} />
          </div>

          <OrganizationMembersCard organizationId={organization.id} members={members} />
          <OrganizationInvoicesCard invoices={invoices} />
        </div>
      </AdminLayout>
    </>
  )
}
