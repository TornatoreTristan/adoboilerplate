import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import type { PlanFormData, SetPlanField } from './types'

interface Props {
  data: PlanFormData
  setData: SetPlanField
}

export function PlanTrialCard({ data, setData }: Props) {
  const { t } = useI18n()
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle>{t('admin.plans_form.section_trial_title')}</CardTitle>
        </div>
        <CardDescription>{t('admin.plans_form.section_trial_description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="trialDays">{t('admin.plans_form.field_trial_days')}</Label>
          <Input
            id="trialDays"
            type="number"
            min="0"
            value={data.trialDays}
            onChange={(e) => setData('trialDays', parseInt(e.target.value) || 0)}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">
            {t('admin.plans_form.field_trial_days_help')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
