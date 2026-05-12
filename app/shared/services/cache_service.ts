import { injectable, inject } from 'inversify'
import type { Redis } from 'ioredis'
import logger from '@adonisjs/core/services/logger'
import { TYPES } from '#shared/container/types'

export interface CacheOptions {
  ttl?: number // Time to live en secondes
  tags?: string[] // Tags pour l'invalidation groupée
}

@injectable()
export default class CacheService {
  constructor(@inject(TYPES.RedisClient) private redis: Redis) {}

  /**
   * Récupérer une valeur depuis le cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      logger.error({ err: error }, 'Cache get error')
      return null
    }
  }

  /**
   * Stocker une valeur dans le cache
   */
  async set(key: string, value: unknown, options: CacheOptions = {}): Promise<void> {
    try {
      const serialized = JSON.stringify(value)

      if (options.ttl) {
        await this.redis.setex(key, options.ttl, serialized)
      } else {
        await this.redis.set(key, serialized)
      }

      // Gérer les tags pour l'invalidation groupée
      if (options.tags && options.tags.length > 0) {
        await this.addToTags(key, options.tags)
      }
    } catch (error) {
      logger.error({ err: error }, 'Cache set error')
    }
  }

  /**
   * Supprimer une clé du cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key)
    } catch (error) {
      logger.error({ err: error }, 'Cache del error')
    }
  }

  /**
   * Supprimer plusieurs clés
   */
  async delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return

    try {
      await this.redis.del(...keys)
    } catch (error) {
      logger.error({ err: error }, 'Cache delMany error')
    }
  }

  /**
   * Invalider toutes les clés associées à des tags
   */
  async invalidateTags(tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const keys = await this.redis.smembers(`tag:${tag}`)
        if (keys.length > 0) {
          await this.delMany(keys)
          await this.redis.del(`tag:${tag}`)
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Cache invalidateTags error')
    }
  }

  /**
   * Vérifier si une clé existe
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      logger.error({ err: error }, 'Cache exists error')
      return false
    }
  }

  /**
   * Flush tout le cache (utiliser avec précaution)
   */
  async flush(): Promise<void> {
    try {
      await this.redis.flushdb()
    } catch (error) {
      logger.error({ err: error }, 'Cache flush error')
    }
  }

  /**
   * Cache-aside pattern avec callback
   */
  async remember<T>(
    key: string,
    callback: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Essayer de récupérer depuis le cache
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Si pas en cache, exécuter le callback
    const value = await callback()

    // Stocker le résultat en cache
    await this.set(key, value, options)

    return value
  }

  /**
   * Incrémenter une valeur numérique
   */
  async increment(key: string, by: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, by)
    } catch (error) {
      logger.error({ err: error }, 'Cache increment error')
      return 0
    }
  }

  /**
   * Ajouter une clé aux tags pour l'invalidation groupée
   */
  private async addToTags(key: string, tags: string[]): Promise<void> {
    const pipeline = this.redis.pipeline()

    for (const tag of tags) {
      pipeline.sadd(`tag:${tag}`, key)
    }

    await pipeline.exec()
  }

  /**
   * Générer une clé de cache formatée
   */
  static buildKey(prefix: string, ...parts: (string | number)[]): string {
    return [prefix, ...parts].join(':')
  }
}
