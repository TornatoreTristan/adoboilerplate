import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Globe } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import type { Organization } from './types'

interface Props {
  organization: Organization
}

export function OrganizationInfoCard({ organization }: Props) {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'en' ? 'en-US' : 'fr-FR'

  const formatDateTime = (iso: string) =>
    new Intl.DateTimeFormat(dateLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.organization_detail.general_info_title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('admin.organization_detail.field_id')}
            </span>
            <span className="font-mono text-xs">{organization.id}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('admin.organization_detail.field_slug')}
            </span>
            <span className="font-mono">/{organization.slug}</span>
          </div>

          {organization.description && (
            <div className="flex flex-col gap-2 text-sm">
              <span className="text-muted-foreground">
                {t('admin.organization_detail.field_description')}
              </span>
              <p className="text-sm">{organization.description}</p>
            </div>
          )}

          {organization.website && (
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground">
                {t('admin.organization_detail.field_website')}
              </span>
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
            <span className="text-muted-foreground">
              {t('admin.organization_detail.field_status')}
            </span>
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
            <span className="text-muted-foreground">
              {t('admin.organization_detail.field_created_at')}
            </span>
            <span>{formatDateTime(organization.createdAt)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('admin.organization_detail.field_updated_at')}
            </span>
            <span>{formatDateTime(organization.updatedAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
