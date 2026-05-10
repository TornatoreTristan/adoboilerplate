import { inject, injectable } from 'inversify'
import { TYPES } from '#shared/container/types'
import type PlanRepository from '#billing/repositories/plan_repository'
import type Plan from '#billing/models/plan'
import type { PricingModel, PricingTier } from '#billing/models/plan'
import Stripe from 'stripe'
import env from '#start/env'

interface CreatePlanData {
  name: string
  slug: string
  description?: string
  priceMonthly: number
  priceYearly: number
  currency: string
  pricingModel: PricingModel
  pricingTiers?: PricingTier[]
  trialDays?: number
  features?: string[]
  limits?: Record<string, any>
  isActive?: boolean
  isVisible?: boolean
  sortOrder?: number
  syncWithStripe?: boolean
}

interface UpdatePlanData {
  name?: string
  description?: string
  priceMonthly?: number
  priceYearly?: number
  currency?: string
  pricingModel?: PricingModel
  pricingTiers?: PricingTier[]
  trialDays?: number
  features?: string[]
  limits?: Record<string, any>
  isActive?: boolean
  isVisible?: boolean
  sortOrder?: number
}

@injectable()
export default class PlanService {
  constructor(@inject(TYPES.PlanRepository) private planRepository: PlanRepository) {}

  async createPlan(data: CreatePlanData): Promise<Plan> {
    let stripeProductId: string | null = null
    let stripePriceIdMonthly: string | null = null
    let stripePriceIdYearly: string | null = null

    if (data.syncWithStripe) {
      const stripeIds = await this.createStripeProduct(
        data.name,
        data.description || '',
        data.priceMonthly,
        data.priceYearly,
        data.currency,
        data.pricingModel,
        data.pricingTiers,
        data.features,
        data.limits
      )
      stripeProductId = stripeIds.productId
      stripePriceIdMonthly = stripeIds.priceIdMonthly
      stripePriceIdYearly = stripeIds.priceIdYearly
    }

    return this.planRepository.create({
      nameI18n: { fr: data.name, en: data.name },
      slug: data.slug,
      descriptionI18n: data.description ? { fr: data.description, en: data.description } : null,
      priceMonthly: data.priceMonthly,
      priceYearly: data.priceYearly,
      currency: data.currency,
      pricingModel: data.pricingModel,
      pricingTiers: data.pricingTiers || null,
      trialDays: data.trialDays || null,
      featuresI18n: data.features
        ? { fr: data.features.join(', '), en: data.features.join(', ') }
        : null,
      limits: data.limits || null,
      isActive: data.isActive ?? true,
      isVisible: data.isVisible ?? true,
      sortOrder: data.sortOrder ?? 0,
      stripeProductId,
      stripePriceIdMonthly,
      stripePriceIdYearly,
    })
  }

  async updatePlan(planId: string, data: UpdatePlanData): Promise<Plan> {
    const plan = await this.planRepository.findByIdOrFail(planId)

    let newStripePriceIdMonthly: string | null = null
    let newStripePriceIdYearly: string | null = null

    // Si le plan est synced avec Stripe
    if (plan.stripeProductId) {
      // 1. Mettre à jour le nom/description/features/limits du produit Stripe
      if (
        data.name ||
        data.description !== undefined ||
        data.features !== undefined ||
        data.limits !== undefined
      ) {
        await this.updateStripeProduct(
          plan.stripeProductId,
          data.name || plan.name,
          data.description !== undefined ? data.description : plan.description || '',
          data.features !== undefined ? data.features : plan.features || undefined,
          data.limits !== undefined ? data.limits : plan.limits || undefined
        )
      }

      // 2. Détecter si le pricing a changé
      const monthlyPricingChanged =
        (data.priceMonthly !== undefined && data.priceMonthly !== plan.priceMonthly) ||
        (data.currency !== undefined && data.currency !== plan.currency) ||
        (data.pricingTiers !== undefined &&
          JSON.stringify(data.pricingTiers) !== JSON.stringify(plan.pricingTiers))

      const yearlyPricingChanged =
        (data.priceYearly !== undefined && data.priceYearly !== plan.priceYearly) ||
        (data.currency !== undefined && data.currency !== plan.currency) ||
        (data.pricingTiers !== undefined &&
          JSON.stringify(data.pricingTiers) !== JSON.stringify(plan.pricingTiers))

      const stripe = await this.getStripeClient()
      if (!stripe) {
        throw new Error('Stripe integration not configured')
      }

      // 3. Créer un nouveau prix mensuel si changement détecté
      if (monthlyPricingChanged) {
        const finalPriceMonthly = data.priceMonthly ?? plan.priceMonthly
        const finalCurrency = data.currency ?? plan.currency
        const finalPricingModel = data.pricingModel ?? plan.pricingModel
        const finalPricingTiers = data.pricingTiers ?? plan.pricingTiers

        const stripePrice = await this.createStripePriceForInterval(
          stripe,
          plan.stripeProductId,
          'month',
          finalPriceMonthly,
          finalCurrency,
          finalPricingModel,
          finalPricingTiers
        )

        newStripePriceIdMonthly = stripePrice.id
      }

      // 4. Créer un nouveau prix annuel si changement détecté
      if (yearlyPricingChanged) {
        const finalPriceYearly = data.priceYearly ?? plan.priceYearly
        const finalCurrency = data.currency ?? plan.currency
        const finalPricingModel = data.pricingModel ?? plan.pricingModel
        const finalPricingTiers = data.pricingTiers ?? plan.pricingTiers

        const stripePrice = await this.createStripePriceForInterval(
          stripe,
          plan.stripeProductId,
          'year',
          finalPriceYearly,
          finalCurrency,
          finalPricingModel,
          finalPricingTiers
        )

        newStripePriceIdYearly = stripePrice.id
      }
    }

    // Mettre à jour la base de données
    return this.planRepository.update(planId, {
      nameI18n: data.name ? { fr: data.name, en: data.name } : undefined,
      descriptionI18n:
        data.description !== undefined
          ? data.description
            ? { fr: data.description, en: data.description }
            : null
          : undefined,
      priceMonthly: data.priceMonthly,
      priceYearly: data.priceYearly,
      currency: data.currency,
      pricingModel: data.pricingModel,
      pricingTiers: data.pricingTiers,
      trialDays: data.trialDays,
      featuresI18n:
        data.features !== undefined
          ? data.features
            ? { fr: data.features.join(', '), en: data.features.join(', ') }
            : null
          : undefined,
      limits: data.limits,
      isActive: data.isActive,
      isVisible: data.isVisible,
      sortOrder: data.sortOrder,
      stripePriceIdMonthly: newStripePriceIdMonthly || plan.stripePriceIdMonthly,
      stripePriceIdYearly: newStripePriceIdYearly || plan.stripePriceIdYearly,
    })
  }

  async syncPlanWithStripe(planId: string): Promise<Plan> {
    const plan = await this.planRepository.findByIdOrFail(planId)

    if (plan.stripeProductId && plan.stripePriceIdMonthly && plan.stripePriceIdYearly) {
      await this.updateStripeProduct(
        plan.stripeProductId,
        plan.name,
        plan.description || '',
        plan.features || undefined,
        plan.limits || undefined
      )
      return plan
    }

    const stripeIds = await this.createStripeProduct(
      plan.name,
      plan.description || '',
      plan.priceMonthly,
      plan.priceYearly,
      plan.currency,
      plan.pricingModel,
      plan.pricingTiers || undefined,
      plan.features || undefined,
      plan.limits || undefined
    )

    return this.planRepository.update(planId, {
      stripeProductId: stripeIds.productId,
      stripePriceIdMonthly: stripeIds.priceIdMonthly,
      stripePriceIdYearly: stripeIds.priceIdYearly,
    })
  }

  async deletePlan(planId: string): Promise<void> {
    const plan = await this.planRepository.findByIdOrFail(planId)

    if (plan.stripeProductId) {
      await this.archiveStripeProduct(plan.stripeProductId)
    }

    await this.planRepository.delete(planId)
  }

  async getPlans(): Promise<Plan[]> {
    return this.planRepository.findAll()
  }

  async getActivePlans(): Promise<Plan[]> {
    return this.planRepository.findActiveAndVisible()
  }

  async getPlanById(planId: string): Promise<Plan> {
    return this.planRepository.findByIdOrFail(planId)
  }

  async getPlanBySlug(slug: string): Promise<Plan | null> {
    return this.planRepository.findBySlug(slug)
  }

  private async getStripeClient(): Promise<Stripe | null> {
    // Niveau A : Utiliser les clés Stripe de l'APPLICATION depuis .env
    // Ceci permet de créer les plans de l'application que les organisations vont acheter
    const secretKey = env.get('STRIPE_SECRET_KEY')

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured in .env')
    }

    return new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
    })
  }

  private async createStripeProduct(
    name: string,
    description: string,
    priceMonthly: number,
    priceYearly: number,
    currency: string,
    pricingModel: PricingModel,
    pricingTiers?: PricingTier[],
    features?: string[],
    limits?: Record<string, any>
  ): Promise<{ productId: string; priceIdMonthly: string; priceIdYearly: string }> {
    const stripe = await this.getStripeClient()

    if (!stripe) {
      throw new Error('Stripe integration not configured')
    }

    // 1. Préparer les marketing_features pour Stripe (max 15 features, 80 chars par nom)
    const marketingFeatures: Array<{ name: string }> = []

    if (features && features.length > 0) {
      // Limiter à 15 features et 80 caractères par feature
      features.slice(0, 15).forEach((feature) => {
        const truncatedFeature = feature.length > 80 ? feature.substring(0, 77) + '...' : feature
        marketingFeatures.push({ name: truncatedFeature })
      })
    }

    // 2. Préparer les metadata pour usage interne (pricing model, limits)
    const metadata: Record<string, string> = {
      pricing_model: pricingModel,
    }

    // Stocker les limits dans metadata (usage interne)
    if (limits && Object.keys(limits).length > 0) {
      metadata.limits = JSON.stringify(limits)
    }

    // 3. Créer le produit Stripe avec marketing_features ET metadata
    const product = await stripe.products.create({
      name,
      description,
      marketing_features: marketingFeatures.length > 0 ? marketingFeatures : undefined,
      metadata,
    })

    // 2. Créer le prix mensuel
    const stripePriceMonthly = await this.createStripePriceForInterval(
      stripe,
      product.id,
      'month',
      priceMonthly,
      currency,
      pricingModel,
      pricingTiers
    )

    // 3. Créer le prix annuel
    const stripePriceYearly = await this.createStripePriceForInterval(
      stripe,
      product.id,
      'year',
      priceYearly,
      currency,
      pricingModel,
      pricingTiers
    )

    return {
      productId: product.id,
      priceIdMonthly: stripePriceMonthly.id,
      priceIdYearly: stripePriceYearly.id,
    }
  }

  private async createStripePriceForInterval(
    stripe: Stripe,
    productId: string,
    interval: 'month' | 'year',
    price: number,
    currency: string,
    pricingModel: PricingModel,
    pricingTiers?: PricingTier[] | null
  ): Promise<Stripe.Price> {
    switch (pricingModel) {
      case 'flat':
      case 'per_seat':
        // Pour flat et per_seat : prix unitaire simple
        // Pour per_seat, la quantity sera le nombre d'utilisateurs
        return stripe.prices.create({
          product: productId,
          unit_amount: Math.round(price * 100),
          currency: currency.toLowerCase(),
          recurring: { interval },
        })

      case 'tiered':
        if (!pricingTiers || pricingTiers.length === 0) {
          throw new Error('pricingTiers is required for tiered pricing model')
        }
        return stripe.prices.create({
          product: productId,
          currency: currency.toLowerCase(),
          recurring: { interval },
          billing_scheme: 'tiered',
          tiers_mode: 'graduated',
          tiers: pricingTiers.map((tier) => ({
            up_to: tier.maxUsers || 'inf',
            flat_amount: tier.price ? Math.round(tier.price * 100) : undefined,
          })),
        })

      case 'volume':
        if (!pricingTiers || pricingTiers.length === 0) {
          throw new Error('pricingTiers is required for volume pricing model')
        }
        return stripe.prices.create({
          product: productId,
          currency: currency.toLowerCase(),
          recurring: { interval },
          billing_scheme: 'tiered',
          tiers_mode: 'volume',
          tiers: pricingTiers.map((tier) => ({
            up_to: tier.maxUsers || 'inf',
            unit_amount: tier.pricePerUser ? Math.round(tier.pricePerUser * 100) : undefined,
          })),
        })

      default:
        throw new Error(`Unsupported pricing model: ${pricingModel}`)
    }
  }

  private async updateStripeProduct(
    productId: string,
    name: string,
    description: string,
    features?: string[],
    limits?: Record<string, any>
  ): Promise<void> {
    const stripe = await this.getStripeClient()

    if (!stripe) {
      throw new Error('Stripe integration not configured')
    }

    // Préparer les marketing_features (max 15 features, 80 chars par nom)
    const marketingFeatures: Array<{ name: string }> = []

    if (features && features.length > 0) {
      features.slice(0, 15).forEach((feature) => {
        const truncatedFeature = feature.length > 80 ? feature.substring(0, 77) + '...' : feature
        marketingFeatures.push({ name: truncatedFeature })
      })
    }

    // Préparer les metadata pour usage interne
    const metadata: Record<string, string> = {}

    if (limits && Object.keys(limits).length > 0) {
      metadata.limits = JSON.stringify(limits)
    }

    await stripe.products.update(productId, {
      name,
      description,
      marketing_features: marketingFeatures.length > 0 ? marketingFeatures : undefined,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    })
  }

  private async archiveStripeProduct(productId: string): Promise<void> {
    const stripe = await this.getStripeClient()

    if (!stripe) {
      return
    }

    await stripe.products.update(productId, {
      active: false,
    })
  }
}
