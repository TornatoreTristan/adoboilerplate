import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { DollarSign, Plus, Trash2 } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import type {
  PlanFormData,
  PlanFormErrors,
  PricingModel,
  PricingTier,
  SetPlanField,
} from './types'

interface Props {
  data: PlanFormData
  setData: SetPlanField
  errors: PlanFormErrors
  /**
   * When true, the pricing-model dropdown is read-only and a different
   * helper text is shown. Editing the pricing model post-creation would
   * require migrating Stripe prices, so the edit flow disables it.
   */
  pricingModelLocked?: boolean
}

export function PlanPricingCard({ data, setData, errors, pricingModelLocked }: Props) {
  const { t } = useI18n()

  const addTier = () => {
    const lastTier = data.pricingTiers[data.pricingTiers.length - 1]
    const newMinUsers = lastTier?.maxUsers ? lastTier.maxUsers + 1 : 1
    setData('pricingTiers', [
      ...data.pricingTiers,
      { minUsers: newMinUsers, maxUsers: null, price: 0, pricePerUser: 0 },
    ])
  }

  const removeTier = (index: number) => {
    if (data.pricingTiers.length > 1) {
      setData(
        'pricingTiers',
        data.pricingTiers.filter((_, i) => i !== index)
      )
    }
  }

  const updateTier = (index: number, field: keyof PricingTier, value: number | null) => {
    const newTiers = [...data.pricingTiers]
    newTiers[index] = { ...newTiers[index], [field]: value }
    setData('pricingTiers', newTiers)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <CardTitle>{t('admin.plans_form.section_pricing_title')}</CardTitle>
        </div>
        <CardDescription>{t('admin.plans_form.section_pricing_description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="pricingModel">{t('admin.plans_form.field_pricing_model')}</Label>
          <Select
            value={data.pricingModel}
            onValueChange={(value) => setData('pricingModel', value as PricingModel)}
            disabled={pricingModelLocked}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">{t('admin.plans_form.model_flat')}</SelectItem>
              <SelectItem value="per_seat">{t('admin.plans_form.model_per_seat')}</SelectItem>
              <SelectItem value="tiered">{t('admin.plans_form.model_tiered')}</SelectItem>
              <SelectItem value="volume">{t('admin.plans_form.model_volume')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {pricingModelLocked
              ? t('admin.plans_edit.pricing_model_locked_help')
              : data.pricingModel === 'flat'
                ? t('admin.plans_form.model_flat_help')
                : data.pricingModel === 'per_seat'
                  ? t('admin.plans_form.model_per_seat_help')
                  : data.pricingModel === 'tiered'
                    ? t('admin.plans_form.model_tiered_help')
                    : t('admin.plans_form.model_volume_help')}
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="currency">{t('admin.plans_form.field_currency')}</Label>
          <Select value={data.currency} onValueChange={(value) => setData('currency', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t('admin.plans_form.field_currency_help')}
          </p>
        </div>

        <Separator />

        {data.pricingModel === 'flat' && (
          <FlatPriceFields data={data} setData={setData} errors={errors} />
        )}

        {data.pricingModel === 'per_seat' && (
          <PerSeatPriceFields data={data} setData={setData} errors={errors} />
        )}

        {(data.pricingModel === 'tiered' || data.pricingModel === 'volume') && (
          <TieredPriceFields
            tiers={data.pricingTiers}
            mode={data.pricingModel}
            onAdd={addTier}
            onRemove={removeTier}
            onUpdate={updateTier}
          />
        )}
      </CardContent>
    </Card>
  )
}

function FlatPriceFields({
  data,
  setData,
  errors,
}: {
  data: PlanFormData
  setData: SetPlanField
  errors: PlanFormErrors
}) {
  const { t } = useI18n()
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="priceMonthly">{t('admin.plans_form.field_price_monthly')}</Label>
        <Input
          id="priceMonthly"
          type="number"
          step="0.01"
          value={data.priceMonthly}
          onChange={(e) => setData('priceMonthly', parseFloat(e.target.value) || 0)}
        />
        {errors.priceMonthly && <p className="text-sm text-destructive">{errors.priceMonthly}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="priceYearly">{t('admin.plans_form.field_price_yearly')}</Label>
        <Input
          id="priceYearly"
          type="number"
          step="0.01"
          value={data.priceYearly}
          onChange={(e) => setData('priceYearly', parseFloat(e.target.value) || 0)}
        />
        {errors.priceYearly && <p className="text-sm text-destructive">{errors.priceYearly}</p>}
      </div>
    </div>
  )
}

function PerSeatPriceFields({
  data,
  setData,
  errors,
}: {
  data: PlanFormData
  setData: SetPlanField
  errors: PlanFormErrors
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priceMonthly">
            {t('admin.plans_form.field_price_monthly_per_seat')}
          </Label>
          <Input
            id="priceMonthly"
            type="number"
            step="0.01"
            value={data.priceMonthly}
            onChange={(e) => setData('priceMonthly', parseFloat(e.target.value) || 0)}
          />
          {errors.priceMonthly && (
            <p className="text-sm text-destructive">{errors.priceMonthly}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('admin.plans_form.field_price_per_user_monthly_help')}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priceYearly">{t('admin.plans_form.field_price_yearly_per_seat')}</Label>
          <Input
            id="priceYearly"
            type="number"
            step="0.01"
            value={data.priceYearly}
            onChange={(e) => setData('priceYearly', parseFloat(e.target.value) || 0)}
          />
          {errors.priceYearly && <p className="text-sm text-destructive">{errors.priceYearly}</p>}
          <p className="text-xs text-muted-foreground">
            {t('admin.plans_form.field_price_per_user_yearly_help')}
          </p>
        </div>
      </div>
      <div className="p-4 border rounded-lg bg-muted/50">
        <p
          className="text-sm text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: t('admin.plans_form.per_seat_example') }}
        />
      </div>
    </div>
  )
}

function TieredPriceFields({
  tiers,
  mode,
  onAdd,
  onRemove,
  onUpdate,
}: {
  tiers: PricingTier[]
  mode: 'tiered' | 'volume'
  onAdd: () => void
  onRemove: (index: number) => void
  onUpdate: (index: number, field: keyof PricingTier, value: number | null) => void
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>{t('admin.plans_form.field_pricing_tiers')}</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {t('admin.plans_form.add_tier')}
        </Button>
      </div>
      {tiers.map((tier, index) => (
        <div key={index} className="flex gap-2 items-end p-4 border rounded-lg">
          <div className="flex-1 space-y-2">
            <Label>{t('admin.plans_form.tier_min_users')}</Label>
            <Input
              type="number"
              min="1"
              value={tier.minUsers}
              onChange={(e) => onUpdate(index, 'minUsers', parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label>{t('admin.plans_form.tier_max_users')}</Label>
            <Input
              type="number"
              min="1"
              value={tier.maxUsers || ''}
              onChange={(e) =>
                onUpdate(index, 'maxUsers', e.target.value ? parseInt(e.target.value) : null)
              }
              placeholder={t('admin.plans_form.tier_max_users_placeholder')}
            />
          </div>
          {mode === 'tiered' && (
            <div className="flex-1 space-y-2">
              <Label>{t('admin.plans_form.tier_fixed_price')}</Label>
              <Input
                type="number"
                step="0.01"
                value={tier.price || 0}
                onChange={(e) => onUpdate(index, 'price', parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
          {mode === 'volume' && (
            <div className="flex-1 space-y-2">
              <Label>{t('admin.plans_form.tier_price_per_user')}</Label>
              <Input
                type="number"
                step="0.01"
                value={tier.pricePerUser || 0}
                onChange={(e) => onUpdate(index, 'pricePerUser', parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
            disabled={tiers.length === 1}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
