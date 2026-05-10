import { FormEventHandler } from 'react'
import { type InertiaFormProps } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/use-i18n'
import type { LegalFormData } from './types'

interface Props {
  form: InertiaFormProps<LegalFormData>
  onSubmit: FormEventHandler
}

export function PrivacyTab({ form, onSubmit }: Props) {
  const { t } = useI18n()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.app_settings_page.privacy_title')}</CardTitle>
        <CardDescription>{t('admin.app_settings_page.privacy_description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="privacyPolicy">
              {t('admin.app_settings_page.privacy_policy_label')}
            </Label>
            <Textarea
              id="privacyPolicy"
              rows={15}
              value={form.data.privacyPolicy}
              onChange={(e) => form.setData('privacyPolicy', e.target.value)}
              placeholder={t('admin.app_settings_page.privacy_policy_placeholder')}
              className="font-mono text-sm"
            />
            {form.errors.privacyPolicy && (
              <p className="text-sm text-red-500">{form.errors.privacyPolicy}</p>
            )}
          </div>

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
