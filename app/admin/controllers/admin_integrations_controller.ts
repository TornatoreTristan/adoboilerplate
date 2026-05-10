import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AdminService from '#admin/services/admin_service'
import type StripeConnectService from '#integrations/services/stripe_connect_service'
import { configureStripeValidator } from '#admin/validators/configure_stripe_validator'
import { AdminIntegrationDtoPresenter } from '#admin/presenters/admin_integration_dto'
import { asInertiaProps } from '#shared/types/inertia_props'
import { randomBytes } from 'node:crypto'

export default class AdminIntegrationsController {
  async integrations({ inertia }: HttpContext) {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const stripeIntegration = await adminService.getIntegration('stripe')

    return inertia.render(
      'admin/integrations',
      asInertiaProps({
        stripe: stripeIntegration
          ? AdminIntegrationDtoPresenter.presentStripe(stripeIntegration)
          : null,
      })
    )
  }

  async configureStripe({ request, response, session, i18n }: HttpContext) {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const data = await request.validateUsing(configureStripeValidator)

    const existingIntegration = await adminService.getIntegration('stripe')

    const config: Record<string, string> = {
      publicKey: data.publicKey,
      secretKey: data.secretKey || existingIntegration?.config.secretKey || '',
      webhookSecret: data.webhookSecret || existingIntegration?.config.webhookSecret || '',
    }

    await adminService.configureIntegration('stripe', config, data.isActive)

    session.flash('success', i18n.t('admin.flash.stripe_configured'))
    return response.redirect().back()
  }

  async stripeConnectAuthorize({ response, session }: HttpContext) {
    const stripeConnectService = getService<StripeConnectService>(TYPES.StripeConnectService)

    const state = randomBytes(32).toString('hex')
    session.put('stripe_oauth_state', state)

    const authUrl = stripeConnectService.getAuthorizationUrl(state)
    return response.redirect(authUrl)
  }

  async stripeConnectCallback({ request, response, session, i18n }: HttpContext) {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const stripeConnectService = getService<StripeConnectService>(TYPES.StripeConnectService)

    const { code, state, error } = request.qs()

    if (error) {
      session.flash('error', i18n.t('admin.flash.stripe_connect_error', { error }))
      return response.redirect('/admin/integrations')
    }

    const savedState = session.get('stripe_oauth_state')
    if (!savedState || savedState !== state) {
      session.flash('error', i18n.t('admin.flash.stripe_invalid_state'))
      return response.redirect('/admin/integrations')
    }

    session.forget('stripe_oauth_state')

    try {
      const tokens = await stripeConnectService.exchangeCodeForToken(code)

      await adminService.configureIntegration(
        'stripe',
        {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          publicKey: tokens.stripe_publishable_key,
          stripeUserId: tokens.stripe_user_id,
          scope: tokens.scope,
        },
        true
      )

      session.flash('success', i18n.t('admin.flash.stripe_connected'))
    } catch (err) {
      session.flash('error', i18n.t('admin.flash.stripe_connect_failed', { error: err.message }))
    }

    return response.redirect('/admin/integrations')
  }

  async stripeDisconnect({ response, session, i18n }: HttpContext) {
    const adminService = getService<AdminService>(TYPES.AdminService)
    const stripeConnectService = getService<StripeConnectService>(TYPES.StripeConnectService)

    try {
      const integration = await adminService.getIntegration('stripe')

      if (integration?.config.stripeUserId) {
        await stripeConnectService.disconnectAccount(integration.config.stripeUserId)
      }

      await adminService.configureIntegration('stripe', {}, false)

      session.flash('success', i18n.t('admin.flash.stripe_disconnected'))
    } catch (err) {
      session.flash('error', i18n.t('admin.flash.stripe_disconnect_failed', { error: err.message }))
    }

    return response.redirect('/admin/integrations')
  }
}
