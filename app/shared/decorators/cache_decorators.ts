import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type CacheService from '#shared/services/cache_service'

export interface CacheableOptions {
  ttl?: number // Time to live en secondes
  key?: string // Clé de cache personnalisée (peut contenir {{param}})
  tags?: string[] // Tags pour l'invalidation
}

export interface CacheEvictOptions {
  key?: string // Clé à supprimer (peut contenir {{param}})
  tags?: string[] // Tags à invalider
  allEntries?: boolean // Supprimer toutes les entrées
}

/**
 * Décorateur pour mettre en cache le résultat d'une méthode
 */
export function Cacheable(options: CacheableOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cache: CacheService = getService(TYPES.CacheService)

      // Construire la clé de cache
      const cacheKey = buildCacheKey(options.key || `${target.constructor.name}:${propertyKey}`, args)

      // Essayer de récupérer depuis le cache
      const cached = await cache.get(cacheKey)
      if (cached !== null) {
        return cached
      }

      // Exécuter la méthode originale
      const result = await originalMethod.apply(this, args)

      // Mettre en cache le résultat
      await cache.set(cacheKey, result, {
        ttl: options.ttl,
        tags: options.tags,
      })

      return result
    }

    return descriptor
  }
}

/**
 * Décorateur pour invalider le cache après l'exécution d'une méthode
 */
export function CacheEvict(options: CacheEvictOptions = {}) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cache: CacheService = getService(TYPES.CacheService)

      // Exécuter la méthode originale
      const result = await originalMethod.apply(this, args)

      // Invalider le cache
      if (options.allEntries) {
        await cache.flush()
      } else if (options.tags && options.tags.length > 0) {
        await cache.invalidateTags(options.tags)
      } else if (options.key) {
        const cacheKey = buildCacheKey(options.key, args)
        await cache.del(cacheKey)
      }

      return result
    }

    return descriptor
  }
}

/**
 * Décorateur combiné : met en cache ET invalide d'autres caches
 */
export function CachePut(cacheOptions: CacheableOptions = {}, evictOptions: CacheEvictOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cache: CacheService = getService(TYPES.CacheService)

      // Exécuter la méthode originale
      const result = await originalMethod.apply(this, args)

      // Mettre en cache le nouveau résultat
      if (cacheOptions.key || cacheOptions.ttl || cacheOptions.tags) {
        const cacheKey = buildCacheKey(
          cacheOptions.key || `${target.constructor.name}:${propertyKey}`,
          args
        )
        await cache.set(cacheKey, result, {
          ttl: cacheOptions.ttl,
          tags: cacheOptions.tags,
        })
      }

      // Invalider d'autres caches
      if (evictOptions.tags && evictOptions.tags.length > 0) {
        await cache.invalidateTags(evictOptions.tags)
      } else if (evictOptions.key) {
        const evictKey = buildCacheKey(evictOptions.key, args)
        await cache.del(evictKey)
      }

      return result
    }

    return descriptor
  }
}

/**
 * Construire une clé de cache en remplaçant les paramètres
 */
function buildCacheKey(template: string, args: any[]): string {
  let key = template

  // Remplacer les placeholders {{0}}, {{1}}, etc. par les arguments
  args.forEach((arg, index) => {
    key = key.replace(new RegExp(`\\{\\{${index}\\}\\}`, 'g'), String(arg))
  })

  // Remplacer les placeholders nommés comme {{id}} si les args sont des objets
  if (args.length > 0 && typeof args[0] === 'object') {
    const firstArg = args[0]
    Object.keys(firstArg).forEach((paramName) => {
      key = key.replace(
        new RegExp(`\\{\\{${paramName}\\}\\}`, 'g'),
        String(firstArg[paramName])
      )
    })
  }

  return key
}

/**
 * Décorateur pour logger les accès au cache
 */
export function CacheLogging(enable: boolean = true) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    if (!enable) return descriptor

    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now()
      const result = await originalMethod.apply(this, args)
      const endTime = Date.now()

      console.log(
        `[CACHE] ${target.constructor.name}.${propertyKey} executed in ${endTime - startTime}ms`
      )

      return result
    }

    return descriptor
  }
}