import { Head, useForm, router } from '@inertiajs/react'
import OrganizationSettingsLayout from '@/components/layouts/organization-settings-layout'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Building2 } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'

interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  website: string | null
  logoUrl: string | null
  email: string | null
  phone: string | null
  siret: string | null
  vatNumber: string | null
  address: string | null
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

interface OrganizationSettingsPageProps {
  organization: Organization
  userRole: string
  members: Member[]
}

const OrganizationSettingsPage = ({ organization }: OrganizationSettingsPageProps) => {
  const { t } = useI18n()
  const { data, setData, put, processing, errors } = useForm({
    name: organization.name || '',
    email: organization.email || '',
    phone: organization.phone || '',
    siret: organization.siret || '',
    vatNumber: organization.vatNumber || '',
    address: organization.address || '',
    website: organization.website || '',
    description: organization.description || '',
  })

  const [uploadingLogo, setUploadingLogo] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    put('/organizations/settings')
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadingLogo(true)
      const formData = new FormData()
      formData.append('logo', file)

      router.post('/organizations/settings/logo', formData, {
        forceFormData: true,
        onFinish: () => setUploadingLogo(false),
      })
    }
  }

  return (
    <>
      <Head title={t('organizations.settings.head_title')} />
      <OrganizationSettingsLayout>
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
          <div>
            <h2 className="text-lg font-semibold">{t('organizations.settings.section_title')}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('organizations.settings.section_description')}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={organization.logoUrl || ''} alt={organization.name} />
              <AvatarFallback>
                <Building2 className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <input
                type="file"
                id="logo-upload"
                accept="image/png,image/jpeg,image/jpg,image/webp"
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
                  ? t('organizations.settings.uploading_logo')
                  : t('organizations.settings.change_logo')}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                {t('organizations.settings.logo_format_hint')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                {t('organizations.settings.name_label')}{' '}
                <span className="text-destructive">{t('organizations.settings.required_marker')}</span>
              </Label>
              <Input
                id="name"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                placeholder={t('organizations.settings.name_placeholder')}
                required
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">{t('organizations.settings.email_label')}</Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                placeholder={t('organizations.settings.email_placeholder')}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">{t('organizations.settings.phone_label')}</Label>
              <Input
                id="phone"
                type="tel"
                value={data.phone}
                onChange={(e) => setData('phone', e.target.value)}
                placeholder={t('organizations.settings.phone_placeholder')}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="siret">{t('organizations.settings.siret_label')}</Label>
                <Input
                  id="siret"
                  value={data.siret}
                  onChange={(e) => setData('siret', e.target.value)}
                  placeholder={t('organizations.settings.siret_placeholder')}
                  maxLength={14}
                />
                {errors.siret && <p className="text-xs text-destructive">{errors.siret}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="vatNumber">{t('organizations.settings.vat_label')}</Label>
                <Input
                  id="vatNumber"
                  value={data.vatNumber}
                  onChange={(e) => setData('vatNumber', e.target.value)}
                  placeholder={t('organizations.settings.vat_placeholder')}
                />
                {errors.vatNumber && (
                  <p className="text-xs text-destructive">{errors.vatNumber}</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">{t('organizations.settings.address_label')}</Label>
              <Textarea
                id="address"
                value={data.address}
                onChange={(e) => setData('address', e.target.value)}
                placeholder={t('organizations.settings.address_placeholder')}
                rows={3}
              />
              {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="website">{t('organizations.settings.website_label')}</Label>
              <Input
                id="website"
                type="url"
                value={data.website}
                onChange={(e) => setData('website', e.target.value)}
                placeholder={t('organizations.settings.website_placeholder')}
              />
              {errors.website && <p className="text-xs text-destructive">{errors.website}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{t('organizations.settings.description_label')}</Label>
              <Textarea
                id="description"
                value={data.description}
                onChange={(e) => setData('description', e.target.value)}
                placeholder={t('organizations.settings.description_placeholder')}
                rows={4}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={processing}>
            {processing
              ? t('organizations.settings.submitting')
              : t('organizations.settings.submit')}
          </Button>
        </form>
      </OrganizationSettingsLayout>
    </>
  )
}

export default OrganizationSettingsPage
