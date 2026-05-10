import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head, useForm, router, usePage } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Settings, FileText, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react'
import { FormEventHandler, useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useI18n } from '@/hooks/use-i18n'

interface Upload {
  id: string
  filename: string
  url: string
}

interface AppSettings {
  id: string
  appName: string
  logoId: string | null
  faviconId: string | null
  termsOfService: string | null
  termsOfSale: string | null
  privacyPolicy: string | null
  logo: Upload | null
  favicon: Upload | null
}

interface SettingsPageProps {
  settings: AppSettings
}

const SettingsPage = ({ settings }: SettingsPageProps) => {
  const { t } = useI18n()
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const { flash } = usePage<{ flash: { success?: string; error?: string } }>().props
  const [showFlash, setShowFlash] = useState(false)

  const brandingForm = useForm({
    appName: settings.appName,
    logoId: settings.logoId,
    faviconId: settings.faviconId,
  })

  const legalForm = useForm({
    termsOfService: settings.termsOfService || '',
    termsOfSale: settings.termsOfSale || '',
    privacyPolicy: settings.privacyPolicy || '',
  })

  useEffect(() => {
    if (flash.success || flash.error) {
      setShowFlash(true)
      const timer = setTimeout(() => setShowFlash(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [flash])

  const handleBrandingSubmit: FormEventHandler = (e) => {
    e.preventDefault()
    brandingForm.post('/admin/settings/branding', { preserveScroll: true })
  }

  const handleLegalSubmit: FormEventHandler = (e) => {
    e.preventDefault()
    legalForm.post('/admin/settings/legal', { preserveScroll: true })
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadingLogo(true)
      const formData = new FormData()
      formData.append('logo', file)

      router.post('/admin/settings/logo', formData, {
        forceFormData: true,
        onFinish: () => setUploadingLogo(false),
        onSuccess: () => router.reload({ only: ['settings'] }),
      })
    }
  }

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadingFavicon(true)
      const formData = new FormData()
      formData.append('favicon', file)

      router.post('/admin/settings/favicon', formData, {
        forceFormData: true,
        onFinish: () => setUploadingFavicon(false),
        onSuccess: () => router.reload({ only: ['settings'] }),
      })
    }
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

          {showFlash && flash.success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{flash.success}</AlertDescription>
            </Alert>
          )}

          {showFlash && flash.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{flash.error}</AlertDescription>
            </Alert>
          )}

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
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.app_settings_page.branding_title')}</CardTitle>
                  <CardDescription>{t('admin.app_settings_page.branding_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBrandingSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="appName">{t('admin.app_settings_page.app_name_label')}</Label>
                      <Input
                        id="appName"
                        type="text"
                        value={brandingForm.data.appName}
                        onChange={(e) => brandingForm.setData('appName', e.target.value)}
                        placeholder={t('admin.app_settings_page.app_name_placeholder')}
                      />
                      {brandingForm.errors.appName && (
                        <p className="text-sm text-red-500">{brandingForm.errors.appName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="logo">{t('admin.app_settings_page.logo_label')}</Label>
                      <div className="flex items-center gap-4">
                        {settings.logo && (
                          <div className="flex items-center gap-2">
                            <img
                              src={settings.logo.url}
                              alt="Logo"
                              className="h-16 w-16 object-contain rounded border"
                            />
                            <span className="text-sm text-muted-foreground">{settings.logo.filename}</span>
                          </div>
                        )}
                        <div>
                          <input
                            type="file"
                            id="logo-upload"
                            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                            className="hidden"
                            onChange={handleLogoChange}
                            disabled={uploadingLogo}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('logo-upload')?.click()}
                            disabled={uploadingLogo}
                          >
                            {uploadingLogo
                              ? t('admin.app_settings_page.uploading')
                              : t('admin.app_settings_page.choose_file')}
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('admin.app_settings_page.logo_format_hint')}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="favicon">{t('admin.app_settings_page.favicon_label')}</Label>
                      <div className="flex items-center gap-4">
                        {settings.favicon && (
                          <div className="flex items-center gap-2">
                            <img
                              src={settings.favicon.url}
                              alt="Favicon"
                              className="h-8 w-8 object-contain rounded border"
                            />
                            <span className="text-sm text-muted-foreground">{settings.favicon.filename}</span>
                          </div>
                        )}
                        <div>
                          <input
                            type="file"
                            id="favicon-upload"
                            accept="image/x-icon,image/png"
                            className="hidden"
                            onChange={handleFaviconChange}
                            disabled={uploadingFavicon}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('favicon-upload')?.click()}
                            disabled={uploadingFavicon}
                          >
                            {uploadingFavicon
                              ? t('admin.app_settings_page.uploading')
                              : t('admin.app_settings_page.choose_file')}
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('admin.app_settings_page.favicon_format_hint')}
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={brandingForm.processing}>
                        {brandingForm.processing
                          ? t('admin.app_settings_page.submitting')
                          : t('admin.app_settings_page.submit')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="legal">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.app_settings_page.legal_title')}</CardTitle>
                  <CardDescription>{t('admin.app_settings_page.legal_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLegalSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="termsOfService">
                        {t('admin.app_settings_page.terms_of_service_label')}
                      </Label>
                      <Textarea
                        id="termsOfService"
                        rows={10}
                        value={legalForm.data.termsOfService}
                        onChange={(e) => legalForm.setData('termsOfService', e.target.value)}
                        placeholder={t('admin.app_settings_page.terms_of_service_placeholder')}
                        className="font-mono text-sm"
                      />
                      {legalForm.errors.termsOfService && (
                        <p className="text-sm text-red-500">{legalForm.errors.termsOfService}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="termsOfSale">{t('admin.app_settings_page.terms_of_sale_label')}</Label>
                      <Textarea
                        id="termsOfSale"
                        rows={10}
                        value={legalForm.data.termsOfSale}
                        onChange={(e) => legalForm.setData('termsOfSale', e.target.value)}
                        placeholder={t('admin.app_settings_page.terms_of_sale_placeholder')}
                        className="font-mono text-sm"
                      />
                      {legalForm.errors.termsOfSale && (
                        <p className="text-sm text-red-500">{legalForm.errors.termsOfSale}</p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={legalForm.processing}>
                        {legalForm.processing
                          ? t('admin.app_settings_page.submitting')
                          : t('admin.app_settings_page.submit')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle>{t('admin.app_settings_page.privacy_title')}</CardTitle>
                  <CardDescription>{t('admin.app_settings_page.privacy_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLegalSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="privacyPolicy">
                        {t('admin.app_settings_page.privacy_policy_label')}
                      </Label>
                      <Textarea
                        id="privacyPolicy"
                        rows={15}
                        value={legalForm.data.privacyPolicy}
                        onChange={(e) => legalForm.setData('privacyPolicy', e.target.value)}
                        placeholder={t('admin.app_settings_page.privacy_policy_placeholder')}
                        className="font-mono text-sm"
                      />
                      {legalForm.errors.privacyPolicy && (
                        <p className="text-sm text-red-500">{legalForm.errors.privacyPolicy}</p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={legalForm.processing}>
                        {legalForm.processing
                          ? t('admin.app_settings_page.submitting')
                          : t('admin.app_settings_page.submit')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </>
  )
}

export default SettingsPage
