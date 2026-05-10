import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Zap } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import type { PlanFormData, SetPlanField } from './types'

interface Props {
  data: PlanFormData
  setData: SetPlanField
}

export function PlanFeaturesCard({ data, setData }: Props) {
  const { t } = useI18n()

  const addFeature = () => setData('features', [...data.features, ''])
  const removeFeature = (index: number) =>
    setData(
      'features',
      data.features.filter((_, i) => i !== index)
    )
  const updateFeature = (index: number, value: string) => {
    const next = [...data.features]
    next[index] = value
    setData('features', next)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <CardTitle>{t('admin.plans_form.section_features_title')}</CardTitle>
        </div>
        <CardDescription>{t('admin.plans_form.section_features_description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.features.map((feature, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={feature}
              onChange={(e) => updateFeature(index, e.target.value)}
              placeholder={t('admin.plans_form.field_feature_placeholder')}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeFeature(index)}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addFeature} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          {t('admin.plans_form.add_feature')}
        </Button>
      </CardContent>
    </Card>
  )
}
