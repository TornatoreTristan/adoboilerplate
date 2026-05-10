import { injectable, inject } from 'inversify'
import { EventEmitter } from 'events'
import { TYPES } from '#shared/container/types'
import type QueueService from './queue_service.js'

export interface EventData {
  [key: string]: any
}

export interface EventOptions {
  async?: boolean // Si true, utilise Bull Queue
  priority?: number
  delay?: number
}

export type EventHandler<T = EventData> = (data: T) => Promise<void> | void

/**
 * EventBusService - Système hybride d'événements
 *
 * - **Sync** : EventEmitter (immediate, in-process) pour hooks et validations
 * - **Async** : Bull Queue (reliable, retryable) pour workflows
 *
 * @example
 * ```typescript
 * // Événement synchrone (immédiat)
 * eventBus.emit('user.validating', { data })
 *
 * // Événement asynchrone (via Bull)
 * eventBus.emit('user.created', { record: user }, { async: true })
 * ```
 */
@injectable()
export default class EventBusService extends EventEmitter {
  constructor(@inject(TYPES.QueueService) private queueService: QueueService) {
    super()
    this.setMaxListeners(100)
  }

  /**
   * Émettre un événement
   * - Sync (default) : EventEmitter natif (immediate, in-process)
   * - Async : Bull Queue (reliable, retryable)
   *
   * Intentionally widens EventEmitter.emit to async — callers that don't
   * await won't break (the queue branch fires-and-forgets), and the sync
   * branch still returns a boolean wrapped in a Promise.
   */
  // @ts-expect-error — deliberate async override of the base sync signature
  async emit(eventName: string, data: EventData = {}, options: EventOptions = {}): Promise<boolean> {
    const { async = false, priority, delay } = options

    if (async) {
      // Événements async → Bull Queue
      await this.queueService.add('events', eventName, data, {
        priority,
        delay,
      })

      return true
    } else {
      // Événements sync → EventEmitter
      return super.emit(eventName, data)
    }
  }

  /**
   * Enregistrer un listener synchrone
   */
  on(eventName: string, handler: EventHandler): this {
    return super.on(eventName, handler)
  }

  /**
   * Enregistrer un listener synchrone (une seule fois)
   */
  once(eventName: string, handler: EventHandler): this {
    return super.once(eventName, handler)
  }

  /**
   * Supprimer un listener
   */
  off(eventName: string, handler: EventHandler): this {
    return super.off(eventName, handler)
  }

  /**
   * Supprimer tous les listeners d'un événement
   */
  removeAllListeners(eventName?: string): this {
    return super.removeAllListeners(eventName)
  }

  /**
   * Obtenir la liste des événements avec leurs listeners
   */
  getEventListeners(): Record<string, { sync: number }> {
    const result: Record<string, { sync: number }> = {}

    for (const eventName of this.eventNames()) {
      const syncCount = this.listenerCount(eventName as string)
      result[eventName as string] = {
        sync: syncCount,
      }
    }

    return result
  }
}
