import { injectable, inject } from 'inversify'
import { DateTime } from 'luxon'
import crypto from 'node:crypto'
import { TYPES } from '#shared/container/types'
import PasswordResetRepository from '#auth/repositories/password_reset_repository'
import UserRepository from '#users/repositories/user_repository'
import hash from '@adonisjs/core/services/hash'

export interface CreateTokenResult {
  id: string
  email: string
  token: string
  expiresAt: DateTime
}

export interface ValidateTokenResult {
  valid: boolean
  email?: string
  error?: string
}

export interface ResetPasswordResult {
  success: boolean
  message: string
}

@injectable()
export default class PasswordResetService {
  constructor(
    @inject(TYPES.PasswordResetRepository) private passwordResetRepository: PasswordResetRepository,
    @inject(TYPES.UserRepository) private userRepository: UserRepository
  ) {}

  /**
   * Crée un token de réinitialisation pour un email donné.
   * Retourne silencieusement si l'email n'existe pas afin de ne pas révéler
   * son existence. Le délai artificiel rend le timing indiscernable.
   */
  async createPasswordResetToken(email: string): Promise<CreateTokenResult | null> {
    const user = await this.userRepository.findByEmail(email)

    if (!user) {
      await new Promise((resolve) => setTimeout(resolve, 250))
      return null
    }

    await this.passwordResetRepository.deleteExpiredTokens()

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = DateTime.now().plus({ hours: 1 })

    const passwordResetToken = await this.passwordResetRepository.createToken({
      email,
      token: tokenHash,
      expiresAt,
    })

    return {
      ...passwordResetToken,
      token: rawToken,
    }
  }

  /**
   * Valide un token de réinitialisation
   */
  async validateToken(token: string): Promise<ValidateTokenResult> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const passwordResetToken = await this.passwordResetRepository.findByToken(tokenHash)

    if (!passwordResetToken) {
      return {
        valid: false,
        error: 'Lien de réinitialisation invalide',
      }
    }

    if (passwordResetToken.isExpired && passwordResetToken.isExpired()) {
      return {
        valid: false,
        error: 'Ce lien de réinitialisation a expiré',
      }
    }

    if (passwordResetToken.isUsed && passwordResetToken.isUsed()) {
      return {
        valid: false,
        error: 'Ce lien de réinitialisation a déjà été utilisé',
      }
    }

    return {
      valid: true,
      email: passwordResetToken.email,
    }
  }

  /**
   * Réinitialise le mot de passe avec un token valide
   */
  async resetPassword(token: string, newPassword: string): Promise<ResetPasswordResult> {
    // Valider le token
    const validation = await this.validateToken(token)
    if (!validation.valid) {
      throw new Error(validation.error || 'Token invalide')
    }

    // Récupérer le token et l'utilisateur
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const passwordResetToken = await this.passwordResetRepository.findByToken(tokenHash)
    if (!passwordResetToken) {
      throw new Error('Token invalide')
    }

    const user = await this.userRepository.findByEmail(passwordResetToken.email)
    if (!user) {
      throw new Error('Utilisateur introuvable')
    }

    // Hasher et mettre à jour le mot de passe
    const hashedPassword = await hash.make(newPassword)
    await this.userRepository.updatePassword(user.id, hashedPassword)

    // Marquer le token comme utilisé
    await this.passwordResetRepository.markAsUsed(passwordResetToken.id)

    return {
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès',
    }
  }

  /**
   * Nettoie les tokens expirés
   */
  async cleanupExpiredTokens(): Promise<number> {
    return await this.passwordResetRepository.deleteExpiredTokens()
  }
}
