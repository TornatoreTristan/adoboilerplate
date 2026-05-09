import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type PlanService from '#billing/services/plan_service'
import type SubscriptionService from '#billing/services/subscription_service'
import type SubscriptionRepository from '#billing/repositories/subscription_repository'
import { createPlanValidator, updatePlanValidator } from '#billing/validators/plan_validator'

export default class PlansController {
  async index({ inertia }: HttpContext) {
    const planService = getService<PlanService>(TYPES.PlanService)
    const subscriptionRepository = getService<SubscriptionRepository>(
      TYPES.SubscriptionRepository
    )

    const plans = await planService.getPlans()

    const plansWithStats = await Promise.all(
      plans.map(async (plan) => {
        const activeSubscriptions = await subscriptionRepository.countByPlanId(plan.id)

        return {
          id: plan.id,
          nameI18n: plan.nameI18n,
          slug: plan.slug,
          descriptionI18n: plan.descriptionI18n,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          currency: plan.currency,
          trialDays: plan.trialDays,
          featuresI18n: plan.featuresI18n,
          limits: plan.limits,
          isActive: plan.isActive,
          isVisible: plan.isVisible,
          sortOrder: plan.sortOrder,
          stripeProductId: plan.stripeProductId,
          stripePriceIdMonthly: plan.stripePriceIdMonthly,
          stripePriceIdYearly: plan.stripePriceIdYearly,
          activeSubscriptions,
          createdAt: plan.createdAt.toISO(),
          updatedAt: plan.updatedAt?.toISO() || null,
        }
      })
    )

    return inertia.render('admin/plans/index', {
      plans: plansWithStats,
    })
  }

  async show({ params, inertia }: HttpContext) {
    const planService = getService<PlanService>(TYPES.PlanService)
    const subscriptionRepository = getService<SubscriptionRepository>(
      TYPES.SubscriptionRepository
    )

    const plan = await planService.getPlanById(params.id)
    const subscriptions = await subscriptionRepository.findByPlanId(params.id)

    return inertia.render('admin/plans/show', {
      plan: {
        id: plan.id,
        nameI18n: plan.nameI18n,
        slug: plan.slug,
        descriptionI18n: plan.descriptionI18n,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        currency: plan.currency,
        trialDays: plan.trialDays,
        featuresI18n: plan.featuresI18n,
        limits: plan.limits,
        isActive: plan.isActive,
        isVisible: plan.isVisible,
        sortOrder: plan.sortOrder,
        stripeProductId: plan.stripeProductId,
        stripePriceIdMonthly: plan.stripePriceIdMonthly,
        stripePriceIdYearly: plan.stripePriceIdYearly,
        createdAt: plan.createdAt.toISO(),
        updatedAt: plan.updatedAt?.toISO() || null,
      },
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        organizationId: sub.organizationId,
        organizationName: sub.organization.name,
        status: sub.status,
        billingInterval: sub.billingInterval,
        stripePriceId: sub.stripePriceId,
        currentPeriodStart: sub.currentPeriodStart?.toISO() || null,
        currentPeriodEnd: sub.currentPeriodEnd?.toISO() || null,
        createdAt: sub.createdAt.toISO(),
      })),
    })
  }

  async create({ inertia }: HttpContext) {
    return inertia.render('admin/plans/create', {})
  }

  async store({ request, response, session }: HttpContext) {
    const planService = getService<PlanService>(TYPES.PlanService)
    const data = await request.validateUsing(createPlanValidator)

    try {
      await planService.createPlan(data)
      session.flash('success', 'Plan créé avec succès')
      return response.redirect('/admin/plans')
    } catch (error) {
      session.flash('error', error.message)
      return response.redirect().back()
    }
  }

  async edit({ params, inertia }: HttpContext) {
    const planService = getService<PlanService>(TYPES.PlanService)
    const plan = await planService.getPlanById(params.id)

    return inertia.render('admin/plans/edit', {
      plan: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        currency: plan.currency,
        pricingModel: plan.pricingModel,
        pricingTiers: plan.pricingTiers,
        trialDays: plan.trialDays,
        features: plan.features,
        limits: plan.limits,
        isActive: plan.isActive,
        isVisible: plan.isVisible,
        sortOrder: plan.sortOrder,
        stripeProductId: plan.stripeProductId,
        stripePriceIdMonthly: plan.stripePriceIdMonthly,
        stripePriceIdYearly: plan.stripePriceIdYearly,
      },
    } as any)
  }

  async update({ params, request, response, session }: HttpContext) {
    const planService = getService<PlanService>(TYPES.PlanService)
    const data = await request.validateUsing(updatePlanValidator)

    try {
      await planService.updatePlan(params.id, data)
      session.flash('success', 'Plan mis à jour avec succès')
      return response.redirect('/admin/plans')
    } catch (error) {
      session.flash('error', error.message)
      return response.redirect().back()
    }
  }

  async destroy({ params, response, session }: HttpContext) {
    const planService = getService<PlanService>(TYPES.PlanService)

    try {
      await planService.deletePlan(params.id)
      session.flash('success', 'Plan supprimé avec succès')
    } catch (error) {
      session.flash('error', error.message)
    }

    return response.redirect('/admin/plans')
  }

  async syncWithStripe({ params, response, session }: HttpContext) {
    const planService = getService<PlanService>(TYPES.PlanService)

    try {
      await planService.syncPlanWithStripe(params.id)
      session.flash('success', 'Plan synchronisé avec Stripe avec succès')
    } catch (error) {
      session.flash('error', error.message)
    }

    return response.redirect().back()
  }

  async migrateSubscription({ params, response, session }: HttpContext) {
    const subscriptionService = getService<SubscriptionService>(TYPES.SubscriptionService)

    try {
      await subscriptionService.migrateToNewPrice(params.subscriptionId)
      session.flash('success', 'Abonnement migré vers le nouveau prix avec succès')
    } catch (error) {
      session.flash('error', error.message)
    }

    return response.redirect().back()
  }
}
