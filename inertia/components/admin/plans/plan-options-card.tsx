import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Eye } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import type { PlanFormData, SetPlanField } from './types'

interface Props {
  data: PlanFormData
  setData: SetPlanField
  /**
   * The "sync with Stripe" switch only makes sense at creation time —
   * existing plans already have a Stripe price pair, so the edit flow
   * never shows this control.
   */
  showStripeSync?: boolean
  /**
   * Card description override (the edit page shows a shorter copy).
   */
  description?: string
}

export function PlanOptionsCard({ data, setData, showStripeSync, description }: Props) {
  const { t } = useI18n()
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <CardTitle>{t('admin.plans_form.section_options_title')}</CardTitle>
        </div>
        <CardDescription>
          {description ?? t('admin.plans_form.section_options_description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="isActive" className="text-base cursor-pointer">
              {t('admin.plans_form.field_is_active')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('admin.plans_form.field_is_active_help')}
            </p>
          </div>
          <Switch
            id="isActive"
            checked={data.isActive}
            onCheckedChange={(checked) => setData('isActive', checked)}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="isVisible" className="text-base cursor-pointer">
              {t('admin.plans_form.field_is_visible')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('admin.plans_form.field_is_visible_help')}
            </p>
          </div>
          <Switch
            id="isVisible"
            checked={data.isVisible}
            onCheckedChange={(checked) => setData('isVisible', checked)}
          />
        </div>

        {showStripeSync && (
          <>
            <Separator />
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="syncWithStripe" className="text-base cursor-pointer">
                  {t('admin.plans_form.field_sync_with_stripe')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('admin.plans_form.field_sync_with_stripe_help')}
                </p>
              </div>
              <Switch
                id="syncWithStripe"
                checked={data.syncWithStripe ?? true}
                onCheckedChange={(checked) => setData('syncWithStripe', checked)}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
