import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import type { PlanFormData, PlanFormErrors, SetPlanField } from './types'

interface Props {
  data: PlanFormData
  setData: SetPlanField
  errors: PlanFormErrors
  /**
   * When true, the slug field is read-only and shows the "slug locked"
   * helper instead of the format-rules helper. Used by the edit flow.
   */
  slugLocked?: boolean
  /**
   * When true, typing in `name` auto-fills `slug` while it's still empty.
   * Used by the create flow.
   */
  autoSlug?: boolean
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const sanitizeSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]/g, '-')

export function PlanGeneralCard({ data, setData, errors, slugLocked, autoSlug }: Props) {
  const { t } = useI18n()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>{t('admin.plans_form.section_general_title')}</CardTitle>
        </div>
        <CardDescription>{t('admin.plans_form.section_general_description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('admin.plans_form.field_name')}</Label>
            <Input
              id="name"
              value={data.name}
              onChange={(e) => {
                const name = e.target.value
                setData('name', name)
                if (autoSlug && (!data.slug || data.slug === '')) {
                  setData('slug', slugify(name))
                }
              }}
              placeholder={t('admin.plans_form.field_name_placeholder')}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">{t('admin.plans_form.field_slug')}</Label>
            <Input
              id="slug"
              value={data.slug}
              onChange={(e) => setData('slug', sanitizeSlug(e.target.value))}
              placeholder={t('admin.plans_form.field_slug_placeholder')}
              disabled={slugLocked}
            />
            <p className="text-xs text-muted-foreground">
              {slugLocked
                ? t('admin.plans_edit.slug_locked_help')
                : t('admin.plans_form.field_slug_help')}
            </p>
            {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('admin.plans_form.field_description')}</Label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e) => setData('description', e.target.value)}
            placeholder={t('admin.plans_form.field_description_placeholder')}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  )
}
