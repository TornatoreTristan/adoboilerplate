import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { inject, injectable } from 'inversify'
import { DateTime } from 'luxon'
import { TYPES } from '#shared/container/types'
import type ApiTokenRepository from '#api/repositories/api_token_repository'
import type ApiToken from '#api/models/api_token'
import type { CreateApiTokenData, GeneratedApiToken } from '#api/types/api_token'
import { isValidScope, type ApiScope } from '#api/constants/api_scopes'
import { E } from '#shared/exceptions/index'

const TOKEN_PREFIX = 'adobp_live_'
const TOKEN_RANDOM_BYTES = 32
const PREFIX_DISPLAY_LENGTH = 16

@injectable()
export default class ApiTokenService {
  constructor(@inject(TYPES.ApiTokenRepository) private apiTokenRepo: ApiTokenRepository) {}

  async generate(data: CreateApiTokenData): Promise<GeneratedApiToken> {
    this.validateScopes(data.scopes)

    const plainToken = this.buildPlainToken()
    const tokenHash = this.hash(plainToken)
    const prefix = plainToken.slice(0, PREFIX_DISPLAY_LENGTH)

    const token = await this.apiTokenRepo.create({
      userId: data.userId,
      organizationId: data.organizationId ?? null,
      name: data.name,
      tokenHash,
      prefix,
      scopes: data.scopes,
      expiresAt: data.expiresAt ? DateTime.fromJSDate(data.expiresAt) : null,
    })

    return {
      id: token.id,
      plainToken,
      prefix,
      name: token.name,
      scopes: token.scopes,
      expiresAt: token.expiresAt?.toJSDate() ?? null,
      createdAt: token.createdAt.toJSDate(),
    }
  }

  async verify(plainToken: string): Promise<ApiToken> {
    if (!this.isWellFormed(plainToken)) {
      E.apiTokenInvalid()
    }

    const tokenHash = this.hash(plainToken)
    const token = await this.apiTokenRepo.findByHash(tokenHash)

    if (!token) {
      E.apiTokenInvalid()
    }

    if (!this.hashesMatch(token.tokenHash, tokenHash)) {
      E.apiTokenInvalid()
    }

    if (token.isRevoked) {
      E.apiTokenRevoked()
    }

    if (token.isExpired) {
      E.apiTokenExpired()
    }

    if (token.deletedAt !== null) {
      E.apiTokenInvalid()
    }

    return token
  }

  async revoke(id: string, userId: string): Promise<ApiToken> {
    const token = await this.apiTokenRepo.findByIdOrFail(id)

    if (token.userId !== userId) {
      E.forbidden('révoquer ce token')
    }

    return this.apiTokenRepo.revoke(id)
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.apiTokenRepo.touchLastUsed(id)
  }

  private buildPlainToken(): string {
    const random = randomBytes(TOKEN_RANDOM_BYTES).toString('base64url')
    return `${TOKEN_PREFIX}${random}`
  }

  private hash(plainToken: string): string {
    return createHash('sha256').update(plainToken).digest('hex')
  }

  private hashesMatch(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'hex')
    const bufB = Buffer.from(b, 'hex')
    if (bufA.length !== bufB.length) return false
    return timingSafeEqual(bufA, bufB)
  }

  private isWellFormed(plainToken: string): boolean {
    return (
      typeof plainToken === 'string' &&
      plainToken.startsWith(TOKEN_PREFIX) &&
      plainToken.length >= TOKEN_PREFIX.length + 32
    )
  }

  private validateScopes(scopes: ApiScope[]): void {
    if (!Array.isArray(scopes) || scopes.length === 0) {
      E.validationError('Au moins un scope est requis', 'scopes')
    }

    const invalid = scopes.filter((s) => !isValidScope(s))
    if (invalid.length > 0) {
      E.fieldInvalid('scopes', invalid.join(', '))
    }
  }
}
