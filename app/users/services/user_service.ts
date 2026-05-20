import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import type { CreateUserData } from '#shared/types/user'
import type UserRepository from '#users/repositories/user_repository'
import type User from '#users/models/user'
import hash from '@adonisjs/core/services/hash'
import { E } from '#shared/exceptions/index'

@injectable()
export default class UserService {
  constructor(@inject(TYPES.UserRepository) private userRepo: UserRepository) {}

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
    return await this.userRepo.update(userId, data)
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.userRepo.delete(userId, { soft: true })
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

    return this.userRepo.update(userId, data)
  }
}
