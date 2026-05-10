import { FormEventHandler, useState } from 'react'
import { router, useForm } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/use-i18n'
import { FileUploadRow } from './file-upload-row'
import type { AppSettings, BrandingFormData } from './types'

interface Props {
  settings: AppSettings
}

export function BrandingTab({ settings }: Props) {
  const { t } = useI18n()
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)

  const form = useForm<BrandingFormData>({
    appName: settings.appName,
    logoId: settings.logoId,
    faviconId: settings.faviconId,
  })

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault()
    form.post('/admin/settings/branding', { preserveScroll: true })
  }

  const upload = (
    field: 'logo' | 'favicon',
    setUploading: (value: boolean) => void
  ): React.ChangeEventHandler<HTMLInputElement> => (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append(field, file)

    router.post(`/admin/settings/${field}`, formData, {
      forceFormData: true,
      onFinish: () => setUploading(false),
      onSuccess: () => router.reload({ only: ['settings'] }),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.app_settings_page.branding_title')}</CardTitle>
        <CardDescription>{t('admin.app_settings_page.branding_description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="appName">{t('admin.app_settings_page.app_name_label')}</Label>
            <Input
              id="appName"
              type="text"
              value={form.data.appName}
              onChange={(e) => form.setData('appName', e.target.value)}
              placeholder={t('admin.app_settings_page.app_name_placeholder')}
            />
            {form.errors.appName && (
              <p className="text-sm text-red-500">{form.errors.appName}</p>
            )}
          </div>

          <FileUploadRow
            id="logo-upload"
            label={t('admin.app_settings_page.logo_label')}
            hint={t('admin.app_settings_page.logo_format_hint')}
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            current={settings.logo}
            uploading={uploadingLogo}
            altText="Logo"
            onChange={upload('logo', setUploadingLogo)}
          />

          <FileUploadRow
            id="favicon-upload"
            label={t('admin.app_settings_page.favicon_label')}
            hint={t('admin.app_settings_page.favicon_format_hint')}
            accept="image/x-icon,image/png"
            current={settings.favicon}
            uploading={uploadingFavicon}
            imageClassName="h-8 w-8"
            altText="Favicon"
            onChange={upload('favicon', setUploadingFavicon)}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={form.processing}>
              {form.processing
                ? t('admin.app_settings_page.submitting')
                : t('admin.app_settings_page.submit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
