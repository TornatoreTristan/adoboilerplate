import { injectable } from 'inversify'
import stripeConfig from '#config/stripe'

interface StripeOAuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  stripe_publishable_key: string
  stripe_user_id: string
  scope: string
}

@injectable()
export default class StripeConnectService {
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: stripeConfig.connect.clientId,
      state,
      scope: 'read_write',
      response_type: 'code',
      redirect_uri: stripeConfig.connect.redirectUri,
    })

    return `https://connect.stripe.com/oauth/authorize?${params.toString()}`
  }

  async exchangeCodeForToken(code: string): Promise<StripeOAuthResponse> {
    const params = new URLSearchParams({
      client_secret: stripeConfig.connect.clientSecret,
      code,
      grant_type: 'authorization_code',
    })

    const response = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = (await response.json()) as { error_description?: string; error?: string }
      throw new Error(`Stripe OAuth error: ${error.error_description || error.error}`)
    }

    return (await response.json()) as StripeOAuthResponse
  }

  async disconnectAccount(stripeUserId: string): Promise<void> {
    const params = new URLSearchParams({
      client_secret: stripeConfig.connect.clientSecret,
      stripe_user_id: stripeUserId,
    })

    const response = await fetch('https://connect.stripe.com/oauth/deauthorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = (await response.json()) as { error_description?: string; error?: string }
      throw new Error(`Stripe deauthorize error: ${error.error_description || error.error}`)
    }
  }
}
