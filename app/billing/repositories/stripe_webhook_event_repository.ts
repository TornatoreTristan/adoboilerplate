import { injectable } from 'inversify'
import { DateTime } from 'luxon'
import { BaseRepository } from '#shared/repositories/base_repository'
import StripeWebhookEvent from '#billing/models/stripe_webhook_event'
import db from '@adonisjs/lucid/services/db'

@injectable()
export default class StripeWebhookEventRepository extends BaseRepository<
  typeof StripeWebhookEvent
> {
  protected model = StripeWebhookEvent

  async hasBeenProcessed(eventId: string): Promise<boolean> {
    return this.exists({ event_id: eventId })
  }

  /**
   * Record that this Stripe event has been handled.
   * Uses INSERT … ON CONFLICT DO NOTHING so concurrent deliveries of the same
   * event_id (Stripe at-least-once guarantee) are silently ignored rather than
   * raising a unique-constraint error.
   */
  async markProcessed(eventId: string, eventType: string): Promise<void> {
    const now = DateTime.now().toSQL({ includeOffset: true })

    await db.rawQuery(
      `INSERT INTO stripe_webhook_events (id, event_id, event_type, processed_at, created_at, updated_at)
       VALUES (gen_random_uuid(), ?, ?, ?, ?, ?)
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType, now, now, now]
    )
  }
}
