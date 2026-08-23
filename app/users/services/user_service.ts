import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import type { CreateUserData } from '#shared/types/user'
import type UserRepository from '#users/repositories/user_repository'
import type User from '#users/models/user'
import type EventBusService from '#shared/services/event_bus_service'
import hash from '@adonisjs/core/services/hash'
import { E } from '#shared/exceptions/index'

@injectable()
export default class UserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: UserRepository,
    @inject(TYPES.EventBus) private eventBus: EventBusService
  ) {}

  async create(userData: CreateUserData): Promise<User> {
    const hashedPassword = await hash.make(userData.password)

    return await this.userRepo.create({
      email: userData.email,
      password: hashedPassword,
      fullName: userData.fullName,
      locale: userData.locale ?? 'fr',
    })
  }

  async findById(userId: string): Promise<User | null> {
    return await this.userRepo.findById(userId)
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepo.findByEmail(email)
  }

  async updateProfile(userId: string, data: { fullName?: string }): Promise<User> {
    const user = await this.userRepo.update(userId, data)

    await this.eventBus.emit('user:updated', {
      updatedBy: userId,
      user: { id: userId },
      changes: data,
    })

    return user
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.userRepo.delete(userId, { soft: true })

    await this.eventBus.emit('user:deleted', {
      deletedBy: userId,
      userId,
      soft: true,
    })
  }

  async updateAdmin(
    userId: string,
    data: { email?: string; fullName?: string | null }
  ): Promise<User> {
    if (data.email) {
      const emailTaken = await this.userRepo.emailExists(data.email, userId)
      if (emailTaken) {
        E.emailAlreadyExists(data.email)
      }
    }

    const user = await this.userRepo.update(userId, data)

    // updatedBy null : mise à jour par un administrateur sur le compte d'un
    // tiers, l'auteur n'est pas connu de ce service.
    await this.eventBus.emit('user:updated', {
      updatedBy: null,
      user: { id: userId },
      changes: data,
    })

    return user
  }
}
