import { injectable } from 'inversify'
import type { CreateUserData } from '#shared/types/user'
import UserModel from '#users/models/user'
import { BaseRepository } from '#shared/repositories/base_repository'

export interface DayCount {
  date: string
  count: number
}

export interface UserListFilters {
  page?: number
  perPage?: number
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface PaginatedUsers {
  data: UserModel[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

@injectable()
export default class UserRepository extends BaseRepository<typeof UserModel> {
  protected model = UserModel

  /**
   * Créer un utilisateur (legacy method pour compatibilité)
   */
  async save(userData: CreateUserData): Promise<UserModel> {
    return this.create(userData)
  }

  /**
   * Trouver un utilisateur par email
   */
  async findByEmail(email: string): Promise<UserModel | null> {
    return this.findOneBy(
      { email },
      {
        cache: { ttl: 300, tags: ['users', 'user_email'] },
      }
    )
  }

  /**
   * Mettre à jour le mot de passe d'un utilisateur
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<UserModel> {
    return this.update(userId, { password: hashedPassword })
  }

  /**
   * Trouver un utilisateur avec ses organisations
   */
  async findWithOrganizations(id: string | number): Promise<UserModel | null> {
    const user = await this.findById(id)
    if (user) {
      await user.load('organizations')
    }
    return user
  }

  /**
   * Vérifier si un email existe déjà
   */
  async emailExists(email: string, excludeId?: string | number): Promise<boolean> {
    const criteria: Record<string, string> = { email }

    if (excludeId) {
      // Pour les mises à jour, exclure l'ID actuel
      const users = await this.findBy(criteria)
      return users.some((user) => user.id !== excludeId)
    }

    return this.exists(criteria)
  }

  /**
   * Rechercher des utilisateurs par nom ou email
   */
  async search(term: string, limit: number = 10): Promise<UserModel[]> {
    const query = this.buildBaseQuery()

    return query
      .where((builder) => {
        builder.where('email', 'LIKE', `%${term}%`).orWhere('full_name', 'LIKE', `%${term}%`)
      })
      .limit(limit)
  }

  /**
   * Obtenir les utilisateurs actifs (non supprimés)
   */
  async findActive(): Promise<UserModel[]> {
    return this.findAll({
      cache: { ttl: 600, tags: ['users', 'active_users'] },
    })
  }

  /**
   * Trouver un utilisateur par email incluant les soft deleted
   */
  async findByEmailIncludingDeleted(email: string): Promise<UserModel | null> {
    return this.findOneBy(
      { email },
      {
        includeDeleted: true,
      }
    )
  }

  /**
   * Restaurer un utilisateur soft deleted
   */
  async restoreDeletedUser(id: string): Promise<UserModel> {
    return this.restore(id)
  }

  async findPaginatedWithFilters(filters: UserListFilters = {}): Promise<PaginatedUsers> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = this.buildBaseQuery()

    if (filters.search) {
      const term = filters.search.trim()
      if (term.length > 0) {
        query.whereRaw(`search_vector @@ plainto_tsquery('french', ?)`, [term])
      }
    }

    if (filters.dateFrom) {
      query.where('created_at', '>=', filters.dateFrom)
    }
    if (filters.dateTo) {
      query.where('created_at', '<=', filters.dateTo)
    }

    const countQuery = query.clone().clearOrder().clearSelect()
    const totalResult = await countQuery.count('* as total')
    const total = Number(
      (totalResult[0] as UserModel & { $extras: { total: string | number } }).$extras.total
    )

    const data = await query
      .orderBy('created_at', 'desc')
      .offset((page - 1) * perPage)
      .limit(perPage)

    return {
      data,
      meta: {
        total,
        perPage,
        currentPage: page,
        lastPage: Math.max(1, Math.ceil(total / perPage)),
      },
    }
  }

  async countByDay(sinceDate: string): Promise<DayCount[]> {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    const rows = await this.buildBaseQuery()
      .select(db.raw('DATE(created_at) as date'))
      .count('* as count')
      .where('created_at', '>=', sinceDate)
      .groupByRaw('DATE(created_at)')
      .orderBy('date', 'asc')

    type AggregateRow = UserModel & {
      $extras?: { date?: string | Date; count?: string | number }
      date?: string | Date
      count?: string | number
    }

    return (rows as AggregateRow[]).map((row) => {
      const extras = row.$extras || {}
      const rawDate = extras.date ?? row.date
      const date =
        rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate).slice(0, 10)
      return {
        date,
        count: Number(extras.count ?? row.count),
      }
    })
  }

  /**
   * Hook après création - invalider les caches email
   */
  protected async afterCreate(user: UserModel): Promise<void> {
    await super.afterCreate(user)
    await this.cache?.invalidateTags(['user_email'])
  }

  /**
   * Hook après mise à jour - invalider les caches email
   */
  protected async afterUpdate(user: UserModel): Promise<void> {
    await super.afterUpdate(user)
    await this.cache?.invalidateTags(['user_email'])
  }
}
