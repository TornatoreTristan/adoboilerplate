import { Head, useForm } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GalleryVerticalEnd } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'

export default function CreateOrganization() {
  const { t } = useI18n()
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    website: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    post('/organizations')
  }

  return (
    <>
      <Head title={t('organizations.create.head_title')} />

      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex justify-center gap-2 md:justify-start">
            <a href="#" className="flex items-center gap-2 font-medium">
              <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-4" />
              </div>
              Acme Inc.
            </a>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2 text-center">
                  <h1 className="text-2xl font-bold">{t('organizations.create.title')}</h1>
                  <p className="text-balance text-muted-foreground text-sm">
                    {t('organizations.create.subtitle')}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="name">{t('organizations.create.name_label')}</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder={t('organizations.create.name_placeholder')}
                      required
                      value={data.name}
                      onChange={(e) => setData('name', e.target.value)}
                    />
                    {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="website">{t('organizations.create.website_label')}</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder={t('organizations.create.website_placeholder')}
                      value={data.website}
                      onChange={(e) => setData('website', e.target.value)}
                    />
                    {errors.website && <p className="text-destructive text-sm">{errors.website}</p>}
                  </div>

                  <Button type="submit" className="w-full" disabled={processing}>
                    {processing
                      ? t('organizations.create.submitting')
                      : t('organizations.create.submit')}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-muted relative hidden lg:block"></div>
      </div>
    </>
  )
}
