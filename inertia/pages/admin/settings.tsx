import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head, useForm, usePage } from '@inertiajs/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Settings, ShieldCheck } from 'lucide-react'
import { FormEventHandler } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { SettingsFlashAlerts } from '@/components/admin/app-settings/settings-flash-alerts'
import { BrandingTab } from '@/components/admin/app-settings/branding-tab'
import { LegalTab } from '@/components/admin/app-settings/legal-tab'
import { PrivacyTab } from '@/components/admin/app-settings/privacy-tab'
import type { AppSettings, LegalFormData } from '@/components/admin/app-settings/types'

interface Props {
  settings: AppSettings
}

export default function SettingsPage({ settings }: Props) {
  const { t } = useI18n()
  const { flash } = usePage<{ flash: { success?: string; error?: string } }>().props

  const legalForm = useForm<LegalFormData>({
    termsOfService: settings.termsOfService || '',
    termsOfSale: settings.termsOfSale || '',
    privacyPolicy: settings.privacyPolicy || '',
  })

  const handleLegalSubmit: FormEventHandler = (e) => {
    e.preventDefault()
    legalForm.post('/admin/settings/legal', { preserveScroll: true })
  }

  return (
    <>
      <Head title={t('admin.app_settings_page.head_title')} />
      <AdminLayout>
        <div className="flex flex-col gap-6 p-6">
          <PageHeader
            title={t('admin.app_settings_page.title')}
            description={t('admin.app_settings_page.description')}
            separator={true}
          />

          <SettingsFlashAlerts flash={flash} />

          <Tabs defaultValue="branding" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>{t('admin.app_settings_page.tab_branding')}</span>
              </TabsTrigger>
              <TabsTrigger value="legal" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>{t('admin.app_settings_page.tab_legal')}</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>{t('admin.app_settings_page.tab_privacy')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="branding">
              <BrandingTab settings={settings} />
            </TabsContent>

            <TabsContent value="legal">
              <LegalTab form={legalForm} onSubmit={handleLegalSubmit} />
            </TabsContent>

            <TabsContent value="privacy">
              <PrivacyTab form={legalForm} onSubmit={handleLegalSubmit} />
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </>
  )
}
