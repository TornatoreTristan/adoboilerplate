import { injectable } from 'inversify'
import Stripe from 'stripe'
import env from '#start/env'

@injectable()
export default class StripeClientService {
  private stripeInstance: Stripe

  constructor() {
    this.stripeInstance = new Stripe(env.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2025-10-29.clover',
    })
  }

  get client(): Stripe {
    return this.stripeInstance
  }
}
