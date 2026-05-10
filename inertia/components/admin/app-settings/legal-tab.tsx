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

export function LegalTab({ form, onSubmit }: Props) {
  const { t } = useI18n()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.app_settings_page.legal_title')}</CardTitle>
        <CardDescription>{t('admin.app_settings_page.legal_description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <Field
            id="termsOfService"
            label={t('admin.app_settings_page.terms_of_service_label')}
            placeholder={t('admin.app_settings_page.terms_of_service_placeholder')}
            value={form.data.termsOfService}
            onChange={(value) => form.setData('termsOfService', value)}
            error={form.errors.termsOfService}
          />

          <Field
            id="termsOfSale"
            label={t('admin.app_settings_page.terms_of_sale_label')}
            placeholder={t('admin.app_settings_page.terms_of_sale_placeholder')}
            value={form.data.termsOfSale}
            onChange={(value) => form.setData('termsOfSale', value)}
            error={form.errors.termsOfSale}
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

interface FieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  error?: string
}

function Field({ id, label, placeholder, value, onChange, error }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        rows={10}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono text-sm"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
