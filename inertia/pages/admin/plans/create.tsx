import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { useI18n } from '@/hooks/use-i18n'
import { Head, router, useForm } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { CreditCard, Plus, Trash2, Sparkles, DollarSign, Calendar, Eye, Zap } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

type PricingModel = 'flat' | 'per_seat' | 'tiered' | 'volume'

interface PricingTier {
  minUsers: number
  maxUsers: number | null
  price?: number
  pricePerUser?: number
}

const CreatePlanPage = () => {
  const { t } = useI18n()
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    slug: '',
    description: '',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'EUR',
    pricingModel: 'flat' as PricingModel,
    pricingTiers: [{ minUsers: 1, maxUsers: null, price: 0 }] as PricingTier[],
    trialDays: 0,
    features: [''],
    limits: {},
    isActive: true,
    isVisible: true,
    sortOrder: 0,
    syncWithStripe: true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/admin/plans')
  }

  const addFeature = () => {
    setData('features', [...data.features, ''])
  }

  const removeFeature = (index: number) => {
    setData(
      'features',
      data.features.filter((_, i) => i !== index)
    )
  }

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...data.features]
    newFeatures[index] = value
    setData('features', newFeatures)
  }

  const addTier = () => {
    const lastTier = data.pricingTiers[data.pricingTiers.length - 1]
    const newMinUsers = lastTier.maxUsers ? lastTier.maxUsers + 1 : 1
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
    <>
      <Head title={t('admin.plans_create.head_title')} />
      <AdminLayout
        breadcrumbs={[
          { label: t('admin.plans_form.breadcrumb_plans'), href: '/admin/plans' },
          { label: t('admin.plans_create.breadcrumb_create') },
        ]}
      >
        <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
          <PageHeader
            title={t('admin.plans_create.title')}
            description={t('admin.plans_create.description')}
            icon={CreditCard}
          />

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informations générales */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>{t('admin.plans_form.section_general_title')}</CardTitle>
                </div>
                <CardDescription>
                  {t('admin.plans_form.section_general_description')}
                </CardDescription>
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
                        // Auto-générer le slug si vide
                        if (!data.slug || data.slug === '') {
                          const slug = name
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, '')
                          setData('slug', slug)
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
                      onChange={(e) =>
                        setData('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                      }
                      placeholder={t('admin.plans_form.field_slug_placeholder')}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('admin.plans_form.field_slug_help')}
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

            {/* Tarification */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <CardTitle>{t('admin.plans_form.section_pricing_title')}</CardTitle>
                </div>
                <CardDescription>
                  {t('admin.plans_form.section_pricing_description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Modèle de pricing */}
                <div className="space-y-2">
                  <Label htmlFor="pricingModel">{t('admin.plans_form.field_pricing_model')}</Label>
                  <Select
                    value={data.pricingModel}
                    onValueChange={(value) => setData('pricingModel', value as PricingModel)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">{t('admin.plans_form.model_flat')}</SelectItem>
                      <SelectItem value="per_seat">
                        {t('admin.plans_form.model_per_seat')}
                      </SelectItem>
                      <SelectItem value="tiered">{t('admin.plans_form.model_tiered')}</SelectItem>
                      <SelectItem value="volume">{t('admin.plans_form.model_volume')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {data.pricingModel === 'flat' && t('admin.plans_form.model_flat_help')}
                    {data.pricingModel === 'per_seat' && t('admin.plans_form.model_per_seat_help')}
                    {data.pricingModel === 'tiered' && t('admin.plans_form.model_tiered_help')}
                    {data.pricingModel === 'volume' && t('admin.plans_form.model_volume_help')}
                  </p>
                </div>

                <Separator />

                {/* Devise */}
                <div className="space-y-2">
                  <Label htmlFor="currency">{t('admin.plans_form.field_currency')}</Label>
                  <Select
                    value={data.currency}
                    onValueChange={(value) => setData('currency', value)}
                  >
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

                {/* Champs conditionnels selon le modèle */}
                {data.pricingModel === 'flat' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priceMonthly">
                        {t('admin.plans_form.field_price_monthly')}
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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priceYearly">
                        {t('admin.plans_form.field_price_yearly')}
                      </Label>
                      <Input
                        id="priceYearly"
                        type="number"
                        step="0.01"
                        value={data.priceYearly}
                        onChange={(e) => setData('priceYearly', parseFloat(e.target.value) || 0)}
                      />
                      {errors.priceYearly && (
                        <p className="text-sm text-destructive">{errors.priceYearly}</p>
                      )}
                    </div>
                  </div>
                )}

                {data.pricingModel === 'per_seat' && (
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
                        <Label htmlFor="priceYearly">
                          {t('admin.plans_form.field_price_yearly_per_seat')}
                        </Label>
                        <Input
                          id="priceYearly"
                          type="number"
                          step="0.01"
                          value={data.priceYearly}
                          onChange={(e) => setData('priceYearly', parseFloat(e.target.value) || 0)}
                        />
                        {errors.priceYearly && (
                          <p className="text-sm text-destructive">{errors.priceYearly}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t('admin.plans_form.field_price_per_user_yearly_help')}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <p
                        className="text-sm text-muted-foreground"
                        dangerouslySetInnerHTML={{
                          __html: t('admin.plans_form.per_seat_example'),
                        }}
                      />
                    </div>
                  </div>
                )}

                {(data.pricingModel === 'tiered' || data.pricingModel === 'volume') && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>{t('admin.plans_form.field_pricing_tiers')}</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addTier}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('admin.plans_form.add_tier')}
                      </Button>
                    </div>
                    {data.pricingTiers.map((tier, index) => (
                      <div key={index} className="flex gap-2 items-end p-4 border rounded-lg">
                        <div className="flex-1 space-y-2">
                          <Label>{t('admin.plans_form.tier_min_users')}</Label>
                          <Input
                            type="number"
                            min="1"
                            value={tier.minUsers}
                            onChange={(e) =>
                              updateTier(index, 'minUsers', parseInt(e.target.value) || 1)
                            }
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label>{t('admin.plans_form.tier_max_users')}</Label>
                          <Input
                            type="number"
                            min="1"
                            value={tier.maxUsers || ''}
                            onChange={(e) =>
                              updateTier(
                                index,
                                'maxUsers',
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            placeholder={t('admin.plans_form.tier_max_users_placeholder')}
                          />
                        </div>
                        {data.pricingModel === 'tiered' && (
                          <div className="flex-1 space-y-2">
                            <Label>{t('admin.plans_form.tier_fixed_price')}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={tier.price || 0}
                              onChange={(e) =>
                                updateTier(index, 'price', parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                        )}
                        {data.pricingModel === 'volume' && (
                          <div className="flex-1 space-y-2">
                            <Label>{t('admin.plans_form.tier_price_per_user')}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={tier.pricePerUser || 0}
                              onChange={(e) =>
                                updateTier(index, 'pricePerUser', parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTier(index)}
                          disabled={data.pricingTiers.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Période d'essai */}
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

            {/* Fonctionnalités */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle>{t('admin.plans_form.section_features_title')}</CardTitle>
                </div>
                <CardDescription>
                  {t('admin.plans_form.section_features_description')}
                </CardDescription>
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

            {/* Options */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <CardTitle>{t('admin.plans_form.section_options_title')}</CardTitle>
                </div>
                <CardDescription>
                  {t('admin.plans_form.section_options_description')}
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
                    checked={data.syncWithStripe}
                    onCheckedChange={(checked) => setData('syncWithStripe', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.visit('/admin/plans')}
                disabled={processing}
              >
                {t('admin.plans_form.cancel')}
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? t('admin.plans_create.submitting') : t('admin.plans_create.submit')}
              </Button>
            </div>
          </form>
        </div>
      </AdminLayout>
    </>
  )
}

export default CreatePlanPage
