import { injectable, inject } from 'inversify'
import type { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'
import { TYPES } from '#shared/container/types'
import type CacheService from '#shared/services/cache_service'
import type EventBusService from '#shared/services/event_bus_service'
import { E } from '#shared/exceptions/index'

export interface PaginationResult<T> {
  data: T[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
    firstPage: number
    firstPageUrl: string
    lastPageUrl: string
    nextPageUrl: string | null
    previousPageUrl: string | null
  }
}

/**
 * Multi-tenant scoping prefix added to the cache key so two tenants never
 * share a cached entry. Pass the tenant id (e.g. organization.id, user.id)
 * any time the cached data depends on the caller's tenant context.
 *
 * Always pass the same scope on read AND mutation paths — otherwise the
 * write will land on an unscoped key and the scoped read will keep returning
 * the stale entry (or vice versa).
 */
export interface CacheReadOptions {
  ttl?: number
  tags?: string[]
  scope?: string
}

export interface CacheMutationOptions {
  tags?: string[]
  scope?: string
}

export interface FindOptions {
  includeDeleted?: boolean
  cache?: CacheReadOptions
}

export interface CreateOptions {
  skipHooks?: boolean
  cache?: CacheMutationOptions
}

export interface UpdateOptions {
  skipHooks?: boolean
  cache?: CacheMutationOptions
}

export interface DeleteOptions {
  soft?: boolean // true = soft delete, false = hard delete
  skipHooks?: boolean
  cache?: CacheMutationOptions
  // Permet de hard-delete une ligne déjà soft-deleted (ex: GDPR
  // processScheduledDeletions, suppression définitive d'un compte planifié).
  includeDeleted?: boolean
}

@injectable()
export abstract class BaseRepository<TModel extends LucidModel> {
  protected abstract model: TModel

  constructor(
    @inject(TYPES.CacheService) protected cache?: CacheService,
    @inject(TYPES.EventBus) protected eventBus?: EventBusService
  ) {
    // Si les services ne sont pas injectés, les récupérer du container
    if (!this.cache || !this.eventBus) {
      try {
        const { getService } = require('#shared/container/container')
        this.cache = this.cache || getService(TYPES.CacheService)
        this.eventBus = this.eventBus || getService(TYPES.EventBus)
      } catch (error) {
        // En cas d'erreur (tests), créer des mocks
        this.cache = this.cache || this.createMockCache()
        this.eventBus = this.eventBus || this.createMockEventBus()
      }
    }
  }

  // ==========================================
  // CRUD DE BASE
  // ==========================================

  /**
   * Trouver un enregistrement par ID
   */
  async findById(
    id: string | number,
    options: FindOptions = {}
  ): Promise<InstanceType<TModel> | null> {
    const cacheKey = this.buildCacheKey(options.cache?.scope, 'id', id)

    if (options.cache) {
      const cached = await this.cache!.get<InstanceType<TModel>>(cacheKey)
      if (cached) return cached
    }

    const query = this.buildBaseQuery(options.includeDeleted)
    const result = await query.where('id', id).first()

    if (result && options.cache) {
      await this.cache!.set(cacheKey, result, options.cache)
    }

    return result
  }

  /**
   * Trouver un enregistrement par ID ou lever une exception
   */
  async findByIdOrFail(
    id: string | number,
    options: FindOptions = {}
  ): Promise<InstanceType<TModel>> {
    const result = await this.findById(id, options)

    if (!result) {
      E.notFound(this.getModelName(), id)
    }

    return result
  }

  /**
   * Trouver tous les enregistrements
   */
  async findAll(options: FindOptions = {}): Promise<InstanceType<TModel>[]> {
    const cacheKey = this.buildCacheKey(options.cache?.scope, 'all')

    if (options.cache) {
      const cached = await this.cache!.get<InstanceType<TModel>[]>(cacheKey)
      if (cached) return cached
    }

    const query = this.buildBaseQuery(options.includeDeleted)
    const results = await query

    if (options.cache) {
      await this.cache!.set(cacheKey, results, options.cache)
    }

    return results
  }

  /**
   * Trouver par critères
   */
  async findBy(
    criteria: Record<string, any>,
    options: FindOptions = {}
  ): Promise<InstanceType<TModel>[]> {
    const query = this.buildBaseQuery(options.includeDeleted)

    for (const [key, value] of Object.entries(criteria)) {
      query.where(key, value)
    }

    return await query
  }

  /**
   * Trouver un enregistrement par critères
   */
  async findOneBy(
    criteria: Record<string, any>,
    options: FindOptions = {}
  ): Promise<InstanceType<TModel> | null> {
    const query = this.buildBaseQuery(options.includeDeleted)

    for (const [key, value] of Object.entries(criteria)) {
      query.where(key, value)
    }

    return await query.first()
  }

  /**
   * Créer un nouvel enregistrement
   */
  async create(
    data: Partial<InstanceType<TModel>>,
    options: CreateOptions = {}
  ): Promise<InstanceType<TModel>> {
    // Hook avant création
    if (!options.skipHooks) {
      await this.beforeCreate(data)
    }

    const result = await this.model.create(data as Partial<InstanceType<TModel>>)

    // Hook après création
    if (!options.skipHooks) {
      await this.afterCreate(result)
    }

    // Invalidation du cache
    if (options.cache?.tags) {
      await this.cache!.invalidateTags(options.cache.tags)
    }
    await this.invalidateListCaches()

    return result
  }

  /**
   * Mettre à jour un enregistrement
   */
  async update(
    id: string | number,
    data: Partial<InstanceType<TModel>>,
    options: UpdateOptions = {}
  ): Promise<InstanceType<TModel>> {
    const record = await this.findByIdOrFail(id)

    // Hook avant mise à jour
    if (!options.skipHooks) {
      await this.beforeUpdate(id, data, record)
    }

    // Mise à jour
    record.merge(data as Partial<InstanceType<TModel>>)
    await record.save()

    // Hook après mise à jour
    if (!options.skipHooks) {
      await this.afterUpdate(record)
    }

    // Invalidation du cache
    await this.cache!.del(this.buildCacheKey(options.cache?.scope, 'id', id))
    if (options.cache?.tags) {
      await this.cache!.invalidateTags(options.cache.tags)
    }
    await this.invalidateListCaches(options.cache?.scope)

    return record
  }

  /**
   * Supprimer un enregistrement
   */
  async delete(id: string | number, options: DeleteOptions = {}): Promise<void> {
    const { soft = true, includeDeleted = false } = options
    const record = await this.findByIdOrFail(id, { includeDeleted })

    // Hook avant suppression
    if (!options.skipHooks) {
      await this.beforeDelete(record)
    }

    if (soft && this.supportsSoftDelete()) {
      // Soft delete — deleted_at is not in the static TModel signature, so we
      // cast via unknown. The supportsSoftDelete() check above guarantees the
      // column exists at runtime.
      record.merge({ deleted_at: DateTime.now() } as unknown as Partial<InstanceType<TModel>>)
      await record.save()
    } else {
      // Hard delete
      await record.delete()
    }

    // Hook après suppression
    if (!options.skipHooks) {
      await this.afterDelete(record)
    }

    // Invalidation du cache
    await this.cache!.del(this.buildCacheKey(options.cache?.scope, 'id', id))
    if (options.cache?.tags) {
      await this.cache!.invalidateTags(options.cache.tags)
    }
    await this.invalidateListCaches(options.cache?.scope)
  }

  /**
   * Restaurer un enregistrement supprimé (soft delete)
   */
  async restore(id: string | number, scope?: string): Promise<InstanceType<TModel>> {
    if (!this.supportsSoftDelete()) {
      E.validationError(`${this.getModelName()} does not support soft deletes`)
    }

    const record = await this.findById(id, { includeDeleted: true })

    if (!record) {
      E.notFound(this.getModelName(), id)
    }

    record.merge({ deleted_at: null } as unknown as Partial<InstanceType<TModel>>)
    await record.save()

    // Invalidation du cache
    await this.cache!.del(this.buildCacheKey(scope, 'id', id))
    await this.invalidateListCaches(scope)

    return record
  }

  // ==========================================
  // QUERIES AVANCÉES
  // ==========================================

  /**
   * Vérifier si un enregistrement existe
   */
  async exists(criteria: Record<string, any>): Promise<boolean> {
    const query = this.buildBaseQuery()

    for (const [key, value] of Object.entries(criteria)) {
      query.where(key, value)
    }

    const result = await query.first()
    return result !== null
  }

  /**
   * Compter les enregistrements
   */
  async count(criteria: Record<string, any> = {}): Promise<number> {
    const query = this.buildBaseQuery()

    for (const [key, value] of Object.entries(criteria)) {
      query.where(key, value)
    }

    const result = await query.count('* as total')
    // Lucid types `count()` as returning model rows, but at runtime each row
    // is a `{ $extras: { total } }` aggregate. Reach into $extras directly.
    const row = result[0] as { $extras?: { total?: string | number } } | undefined
    const total = row?.$extras?.total
    return typeof total === 'number' ? total : Number.parseInt((total as string) || '0', 10)
  }

  /**
   * Pagination
   */
  async paginate(
    page: number = 1,
    perPage: number = 20,
    criteria: Record<string, any> = {}
  ): Promise<PaginationResult<InstanceType<TModel>>> {
    const query = this.buildBaseQuery()

    for (const [key, value] of Object.entries(criteria)) {
      query.where(key, value)
    }

    const result = await query.paginate(page, perPage)

    return {
      data: result.all(),
      meta: result.getMeta(),
    } as PaginationResult<InstanceType<TModel>>
  }

  // ==========================================
  // HOOKS (à override dans les sous-classes)
  // ==========================================

  protected async beforeCreate(data: Partial<InstanceType<TModel>>): Promise<void> {
    // Événement SYNC - peut être utilisé pour validation ou modification de données
    await this.eventBus!.emit(`${this.getModelName().toLowerCase()}.before_create`, { data })
  }

  protected async afterCreate(record: InstanceType<TModel>): Promise<void> {
    // Événement ASYNC via Bull Queue - déclenche des workflows (emails, notifications, etc.)
    await this.eventBus!.emit(
      `${this.getModelName().toLowerCase()}.created`,
      { record },
      { async: true }
    )
  }

  protected async beforeUpdate(
    id: string | number,
    data: Partial<InstanceType<TModel>>,
    record: InstanceType<TModel>
  ): Promise<void> {
    // Événement SYNC - peut être utilisé pour validation ou modification de données
    await this.eventBus!.emit(`${this.getModelName().toLowerCase()}.before_update`, {
      id,
      data,
      record,
    })
  }

  protected async afterUpdate(record: InstanceType<TModel>): Promise<void> {
    // Événement ASYNC via Bull Queue - déclenche des workflows
    await this.eventBus!.emit(
      `${this.getModelName().toLowerCase()}.updated`,
      { record },
      { async: true }
    )
  }

  protected async beforeDelete(record: InstanceType<TModel>): Promise<void> {
    // Événement SYNC - peut être utilisé pour validation
    await this.eventBus!.emit(`${this.getModelName().toLowerCase()}.before_delete`, { record })
  }

  protected async afterDelete(record: InstanceType<TModel>): Promise<void> {
    // Événement ASYNC via Bull Queue - déclenche des workflows (cleanup, notifications, etc.)
    await this.eventBus!.emit(
      `${this.getModelName().toLowerCase()}.deleted`,
      { record },
      { async: true }
    )
  }

  // ==========================================
  // HELPERS
  // ==========================================

  /**
   * Construire une query de base avec gestion des soft deletes
   */
  protected buildBaseQuery(
    includeDeleted: boolean = false
  ): ModelQueryBuilderContract<TModel, InstanceType<TModel>> {
    const query = this.model.query()

    if (!includeDeleted && this.supportsSoftDelete()) {
      query.whereNull('deleted_at')
    }

    return query
  }

  /**
   * Vérifier si le modèle supporte les soft deletes
   */
  protected supportsSoftDelete(): boolean {
    // Vérifier si le modèle a une colonne deleted_at dans ses colonnes définies
    const columns = (this.model as unknown as { $columnsDefinitions?: Map<string, unknown> })
      .$columnsDefinitions
    return !!columns && columns.has('deleted_at')
  }

  /**
   * Obtenir le nom du modèle
   */
  protected getModelName(): string {
    return this.model.name
  }

  /**
   * Construire une clé de cache. Le `scope` (organizationId, userId, ...)
   * est inséré comme préfixe pour isoler les caches multi-tenant. Sans scope,
   * la clé est globale — n'utiliser que pour des données réellement partagées
   * entre tenants (plans publics, settings globaux, etc.).
   */
  protected buildCacheKey(scope: string | undefined, ...parts: (string | number)[]): string {
    const base = this.getModelName().toLowerCase()
    if (scope) {
      return [base, `scope:${scope}`, ...parts].join(':')
    }
    return [base, ...parts].join(':')
  }

  /**
   * Invalider les caches de listes. Si `scope` est fourni, invalide aussi
   * le tag scopé (ex: `users_list@org_<id>`) pour éviter de balayer le cache
   * de toutes les organisations à chaque écriture locale.
   */
  protected async invalidateListCaches(scope?: string): Promise<void> {
    const base = this.getModelName().toLowerCase()
    const tags = [base, `${base}_list`]
    if (scope) {
      tags.push(`${base}_list@${scope}`, `${base}@${scope}`)
    }
    await this.cache!.invalidateTags(tags)
  }

  /**
   * Créer un mock de cache pour les tests
   */
  private createMockCache(): CacheService {
    return {
      get: async () => null,
      set: async () => {},
      del: async () => {},
      invalidateTags: async () => {},
      exists: async () => false,
      flush: async () => {},
    } as unknown as CacheService
  }

  /**
   * Créer un mock d'event bus pour les tests
   */
  private createMockEventBus(): EventBusService {
    return {
      emit: async () => true,
      on: () => {},
      once: () => {},
      off: () => {},
    } as unknown as EventBusService
  }
}
