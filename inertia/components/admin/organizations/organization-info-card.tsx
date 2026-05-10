import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Globe } from 'lucide-react'
import { KeyValueRow } from '@/components/core/key-value-row'
import { useI18n } from '@/hooks/use-i18n'
import { useFormatDate } from '@/hooks/use-format-date'
import type { Organization } from './types'

interface Props {
  organization: Organization
}

export function OrganizationInfoCard({ organization }: Props) {
  const { t } = useI18n()
  const formatDate = useFormatDate()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.organization_detail.general_info_title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <KeyValueRow
            label={t('admin.organization_detail.field_id')}
            value={organization.id}
            valueClassName="font-mono text-xs"
          />

          <KeyValueRow
            label={t('admin.organization_detail.field_slug')}
            value={`/${organization.slug}`}
            valueClassName="font-mono"
          />

          {organization.description && (
            <div className="flex flex-col gap-2 text-sm">
              <span className="text-muted-foreground">
                {t('admin.organization_detail.field_description')}
              </span>
              <p className="text-sm">{organization.description}</p>
            </div>
          )}

          {organization.website && (
            <KeyValueRow
              label={t('admin.organization_detail.field_website')}
              value={
                <a
                  href={organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <Globe className="h-3 w-3" />
                  <span className="text-xs">{organization.website}</span>
                </a>
              }
            />
          )}

          <KeyValueRow
            label={t('admin.organization_detail.field_status')}
            value={
              organization.isActive ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{t('admin.organization_detail.status_active')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-orange-600">
                  <XCircle className="h-4 w-4" />
                  <span>{t('admin.organization_detail.status_inactive')}</span>
                </div>
              )
            }
          />

          <KeyValueRow
            label={t('admin.organization_detail.field_created_at')}
            value={formatDate(organization.createdAt, 'datetime')}
          />

          <KeyValueRow
            label={t('admin.organization_detail.field_updated_at')}
            value={formatDate(organization.updatedAt, 'datetime')}
          />
        </div>
      </CardContent>
    </Card>
  )
}
