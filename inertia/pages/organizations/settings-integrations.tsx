import { Head } from '@inertiajs/react'
import OrganizationSettingsLayout from '@/components/layouts/organization-settings-layout'
import { useI18n } from '@/hooks/use-i18n'

const OrganizationSettingsIntegrationsPage = () => {
  const { t } = useI18n()
  return (
    <>
      <Head title={t('organizations.integrations.head_title')} />
      <OrganizationSettingsLayout>
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">{t('organizations.integrations.section_title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('organizations.integrations.coming_soon')}
          </p>
        </div>
      </OrganizationSettingsLayout>
    </>
  )
}

export default OrganizationSettingsIntegrationsPage
