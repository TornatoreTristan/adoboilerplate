import { injectable } from 'inversify'
import { DateTime } from 'luxon'
import PasswordResetToken from '#auth/models/password_reset_token'
import { BaseRepository } from '#shared/repositories/base_repository'
import type { CreateTokenResult } from '#auth/services/password_reset_service'

export interface CreatePasswordResetTokenData {
  email: string
  token: string
  expiresAt: DateTime
}

@injectable()
export default class PasswordResetRepository extends BaseRepository<typeof PasswordResetToken> {
  protected model = PasswordResetToken

  async createToken(data: CreatePasswordResetTokenData): Promise<CreateTokenResult> {
    const token = await this.create(data)
    return {
      id: token.id,
      email: token.email,
      token: token.token,
      expiresAt: token.expiresAt,
    }
  }

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    return this.findOneBy({ token })
  }

  async markAsUsed(tokenId: string): Promise<void> {
    await this.update(tokenId, {
      usedAt: DateTime.now(),
    })
  }

  async deleteExpiredTokens(): Promise<number> {
    const expiredTokens = await this.buildBaseQuery()
      .where('expires_at', '<', DateTime.now().toSQL())
      .exec()

    for (const token of expiredTokens) {
      await this.delete(token.id, { soft: false })
    }

    return expiredTokens.length
  }

  async deleteByEmail(email: string): Promise<number> {
    const tokens = await this.findBy({ email })

    for (const token of tokens) {
      await this.delete(token.id, { soft: false })
    }

    return tokens.length
  }

  async findValidByEmail(email: string): Promise<PasswordResetToken[]> {
    return this.buildBaseQuery()
      .where('email', email)
      .where('expires_at', '>', DateTime.now().toSQL())
      .whereNull('used_at')
      .exec()
  }
}
