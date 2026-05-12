import { injectable, inject } from 'inversify'
import { EventEmitter } from 'node:events'
import { TYPES } from '#shared/container/types'
import type QueueService from './queue_service.js'

export interface EventData {
  [key: string]: unknown
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
   * - Sync (default) : await tous les listeners (async-safe)
   * - Async : Bull Queue (reliable, retryable)
   *
   * Pour la branche sync, on appelle chaque listener manuellement et on
   * attend les Promises retournées. Le `super.emit` natif d'EventEmitter ne
   * fait pas ça — il invoque les listeners mais ne les attend pas, ce qui
   * force les tests à utiliser des `setTimeout` hasardeux. En awaitant les
   * listeners ici, `await eventBus.emit(...)` garantit que tous les
   * handlers sync/async sont terminés au retour.
   */
  // @ts-expect-error — deliberate async override of the base sync signature
  async emit(
    eventName: string,
    data: EventData = {},
    options: EventOptions = {}
  ): Promise<boolean> {
    const { async = false, priority, delay } = options

    if (async) {
      // Événements async → Bull Queue
      await this.queueService.add('events', eventName, data, {
        priority,
        delay,
      })

      return true
    }

    // Événements sync → invoquer chaque listener et attendre le résultat.
    // `Promise.allSettled` propage le comportement historique (les erreurs
    // d'un listener ne crashent pas les autres ; elles restent attrapables
    // via le rejet d'une Promise individuelle si besoin).
    const listeners = this.listeners(eventName) as Array<EventHandler>
    if (listeners.length === 0) return false

    await Promise.allSettled(listeners.map((listener) => listener(data)))
    return true
  }

  /**
   * Enregistrer un listener synchrone
   */
  on<T = EventData>(eventName: string, handler: EventHandler<T>): this {
    return super.on(eventName, handler as EventHandler)
  }

  /**
   * Enregistrer un listener synchrone (une seule fois)
   */
  once<T = EventData>(eventName: string, handler: EventHandler<T>): this {
    return super.once(eventName, handler as EventHandler)
  }

  /**
   * Supprimer un listener
   */
  off<T = EventData>(eventName: string, handler: EventHandler<T>): this {
    return super.off(eventName, handler as EventHandler)
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
