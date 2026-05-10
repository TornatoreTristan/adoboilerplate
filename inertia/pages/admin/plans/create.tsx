import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
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
      <Head title="Créer un plan" />
      <AdminLayout breadcrumbs={[{ label: 'Plans', href: '/admin/plans' }, { label: 'Créer' }]}>
        <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
          <PageHeader
            title="Créer un plan d'abonnement"
            description="Définissez un nouveau plan pour votre SaaS avec tarification et fonctionnalités"
            icon={CreditCard}
          />

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informations générales */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>Informations générales</CardTitle>
                </div>
                <CardDescription>Nom et description du plan d'abonnement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du plan *</Label>
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
                      placeholder="Pro"
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={data.slug}
                      onChange={(e) =>
                        setData('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                      }
                      placeholder="pro"
                    />
                    <p className="text-xs text-muted-foreground">
                      Uniquement lettres minuscules, chiffres et tirets
                    </p>
                    {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Décrivez les avantages de ce plan..."
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
                  <CardTitle>Tarification</CardTitle>
                </div>
                <CardDescription>Configuration du modèle de pricing et tarifs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Modèle de pricing */}
                <div className="space-y-2">
                  <Label htmlFor="pricingModel">Modèle de tarification *</Label>
                  <Select
                    value={data.pricingModel}
                    onValueChange={(value) => setData('pricingModel', value as PricingModel)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Prix fixe</SelectItem>
                      <SelectItem value="per_seat">Par utilisateur (per-seat)</SelectItem>
                      <SelectItem value="tiered">Par tranches (tiered)</SelectItem>
                      <SelectItem value="volume">Volume dégressif</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {data.pricingModel === 'flat' && 'Prix fixe mensuel ou annuel'}
                    {data.pricingModel === 'per_seat' &&
                      'Prix de base + prix par utilisateur supplémentaire'}
                    {data.pricingModel === 'tiered' &&
                      "Prix fixe selon la tranche de nombre d'utilisateurs"}
                    {data.pricingModel === 'volume' &&
                      'Prix par utilisateur dégressif selon le volume'}
                  </p>
                </div>

                <Separator />

                {/* Devise */}
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise *</Label>
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
                    Les prix mensuels et annuels seront dans cette devise
                  </p>
                </div>

                <Separator />

                {/* Champs conditionnels selon le modèle */}
                {data.pricingModel === 'flat' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priceMonthly">Prix mensuel *</Label>
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
                      <Label htmlFor="priceYearly">Prix annuel *</Label>
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
                        <Label htmlFor="priceMonthly">Prix par siège (mensuel) *</Label>
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
                        <p className="text-xs text-muted-foreground">Prix par utilisateur/mois</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priceYearly">Prix par siège (annuel) *</Label>
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
                        <p className="text-xs text-muted-foreground">Prix par utilisateur/an</p>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        <strong>Modèle par siège :</strong> Le prix est multiplié par le nombre
                        d'utilisateurs.
                        <br />
                        Exemple : 5 utilisateurs × 29€ = 145€/mois
                      </p>
                    </div>
                  </div>
                )}

                {(data.pricingModel === 'tiered' || data.pricingModel === 'volume') && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Paliers de tarification *</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addTier}>
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un palier
                      </Button>
                    </div>
                    {data.pricingTiers.map((tier, index) => (
                      <div key={index} className="flex gap-2 items-end p-4 border rounded-lg">
                        <div className="flex-1 space-y-2">
                          <Label>Utilisateurs min</Label>
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
                          <Label>Utilisateurs max</Label>
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
                            placeholder="Illimité"
                          />
                        </div>
                        {data.pricingModel === 'tiered' && (
                          <div className="flex-1 space-y-2">
                            <Label>Prix fixe</Label>
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
                            <Label>Prix par utilisateur</Label>
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
                  <CardTitle>Période d'essai</CardTitle>
                </div>
                <CardDescription>Offrez une période d'essai gratuite (optionnel)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="trialDays">Nombre de jours d'essai gratuit</Label>
                  <Input
                    id="trialDays"
                    type="number"
                    min="0"
                    value={data.trialDays}
                    onChange={(e) => setData('trialDays', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Laissez à 0 pour aucune période d'essai
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Fonctionnalités */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle>Fonctionnalités</CardTitle>
                </div>
                <CardDescription>Liste des fonctionnalités incluses dans ce plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.features.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => updateFeature(index, e.target.value)}
                      placeholder="Ex: 10 utilisateurs maximum"
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
                  Ajouter une fonctionnalité
                </Button>
              </CardContent>
            </Card>

            {/* Options */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <CardTitle>Options</CardTitle>
                </div>
                <CardDescription>Configurez la visibilité et l'intégration Stripe</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="isActive" className="text-base cursor-pointer">
                      Plan actif
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Les utilisateurs peuvent souscrire à ce plan
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
                      Plan visible
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Afficher ce plan sur la page de tarification publique
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
                      Synchroniser avec Stripe
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Créer automatiquement le produit et le prix dans Stripe
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
                Annuler
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? 'Création en cours...' : 'Créer le plan'}
              </Button>
            </div>
          </form>
        </div>
      </AdminLayout>
    </>
  )
}

export default CreatePlanPage
