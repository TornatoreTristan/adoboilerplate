import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type SubscriptionService from '#billing/services/subscription_service'
import type AdminService from '#admin/services/admin_service'
import type PlanService from '#billing/services/plan_service'
import { AdminSubscriptionDtoPresenter } from '#admin/presenters/admin_subscription_dto'
import { asInertiaProps } from '#shared/types/inertia_props'

export default class AdminSubscriptionsController {
  async subscriptions({ inertia, request }: HttpContext) {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const planService = getService<PlanService>(TYPES.PlanService)

    const status = request.input('status')
    const planId = request.input('planId')
    const search = request.input('search')

    const [subscriptions, stats, plans] = await Promise.all([
      adminService.getAllSubscriptions({ status, planId, search }),
      adminService.getSubscriptionsStats(),
      planService.getPlans(),
    ])

    return inertia.render(
      'admin/subscriptions',
      asInertiaProps({
        subscriptions: subscriptions.map((sub) => AdminSubscriptionDtoPresenter.present(sub)),
        stats: {
          total: Number(stats.total) || 0,
          active: Number(stats.active) || 0,
          trialing: Number(stats.trialing) || 0,
          paused: Number(stats.paused) || 0,
          canceled: Number(stats.canceled) || 0,
          pastDue: Number(stats.pastDue) || 0,
        },
        plans: plans.map((plan) => AdminSubscriptionDtoPresenter.presentPlanSummary(plan)),
        filters: { status, planId, search },
      })
    )
  }

  /**
   * Mettre en pause un abonnement (Admin uniquement)
   */
  async pause({ response, session, params, i18n }: HttpContext) {
    const subscriptionId = params.id
    const subscriptionService = getService<SubscriptionService>(TYPES.SubscriptionService)

    try {
      await subscriptionService.pauseSubscription(subscriptionId)
      session.flash('success', i18n.t('admin.flash.subscription_paused'))
    } catch (error) {
      session.flash(
        'error',
        i18n.t('admin.flash.subscription_action_failed', { error: error.message })
      )
    }

    return response.redirect().back()
  }

  async resume({ response, session, params, i18n }: HttpContext) {
    const subscriptionId = params.id
    const subscriptionService = getService<SubscriptionService>(TYPES.SubscriptionService)

    try {
      await subscriptionService.resumeSubscription(subscriptionId)
      session.flash('success', i18n.t('admin.flash.subscription_resumed'))
    } catch (error) {
      session.flash(
        'error',
        i18n.t('admin.flash.subscription_action_failed', { error: error.message })
      )
    }

    return response.redirect().back()
  }

  async cancel({ response, session, params, i18n }: HttpContext) {
    const subscriptionId = params.id
    const subscriptionService = getService<SubscriptionService>(TYPES.SubscriptionService)

    try {
      await subscriptionService.cancelSubscription(subscriptionId)
      session.flash('success', i18n.t('admin.flash.subscription_canceled'))
    } catch (error) {
      session.flash(
        'error',
        i18n.t('admin.flash.subscription_action_failed', { error: error.message })
      )
    }

    return response.redirect().back()
  }

  async reactivate({ response, session, params, i18n }: HttpContext) {
    const subscriptionId = params.id
    const subscriptionService = getService<SubscriptionService>(TYPES.SubscriptionService)

    try {
      await subscriptionService.reactivateSubscription(subscriptionId)
      session.flash('success', i18n.t('admin.flash.subscription_reactivated'))
    } catch (error) {
      session.flash(
        'error',
        i18n.t('admin.flash.subscription_action_failed', { error: error.message })
      )
    }

    return response.redirect().back()
  }
}
